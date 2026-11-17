#!/usr/bin/env python3
"""Unit tests for the pure parts of up.py (ADR-0016, S1-08.09). No docker, no network.

Run with: python -m unittest scripts/dev/test_up.py   (or python scripts/dev/test_up.py)
"""

from __future__ import annotations

import argparse
import copy
import threading
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stack_config as sc  # noqa: E402
import up  # noqa: E402


def _template() -> dict:
    return up.load_realm_template()


class RenderRealmTests(unittest.TestCase):
    def test_pwa_client_follows_the_worktree_web_origin_and_api_audience(self) -> None:
        realm = up.render_realm(_template(), 23450, 23458)
        client = next(c for c in realm["clients"] if c["clientId"] == "slay-drip-pwa")
        self.assertEqual(client["redirectUris"], ["http://localhost:23450/auth/callback"])
        self.assertEqual(client["webOrigins"], ["http://localhost:23450"])
        self.assertEqual(client["attributes"]["post.logout.redirect.uris"], "http://localhost:23450/")
        mapper = next(m for m in client["protocolMappers"] if m["protocolMapper"] == "oidc-audience-mapper")
        self.assertEqual(mapper["config"]["included.custom.audience"], "http://127.0.0.1:23458")

    def test_render_does_not_change_the_committed_template(self) -> None:
        template = _template()
        before = copy.deepcopy(template)
        up.render_realm(template, 23450, 23458)
        self.assertEqual(template, before)

    def test_render_keeps_the_synthetic_users_and_other_clients(self) -> None:
        template = _template()
        realm = up.render_realm(template, 23450, 23458)
        self.assertEqual(realm["users"], template["users"])
        admin = [c for c in realm["clients"] if c["clientId"] == "slay-drip-backend-admin"]
        self.assertEqual(len(admin), 1)

    def test_every_user_is_a_synthetic_example_test_address(self) -> None:
        for user in _template()["users"]:
            name = user.get("email") or user.get("username", "")
            if name.startswith("service-account-"):
                continue
            self.assertTrue(name.endswith("@example.test"), name)

    def test_missing_pwa_client_is_refused(self) -> None:
        template = _template()
        template["clients"] = [c for c in template["clients"] if c["clientId"] != "slay-drip-pwa"]
        with self.assertRaises(up.UpError):
            up.render_realm(template, 23450, 23458)


class StackValuesTests(unittest.TestCase):
    def setUp(self) -> None:
        self.ports = sc.block_ports(0)
        self.values = up.build_stack_values({"project": "slaydrip-test0001", "ports": self.ports}, _template())

    def test_test_database_is_the_dedicated_test_database(self) -> None:
        self.assertTrue(self.values["test_database_url"].endswith("/slaydrip_test?sslmode=disable"))
        self.assertEqual(
            sc.validate_allocation({"project": "slaydrip-test0001", "ports": self.ports})["ports"],
            self.ports,
        )

    def test_env_has_the_config_contract_keys_with_this_worktree_ports(self) -> None:
        env = self.values["env"]
        for key in (
            "S3_ENDPOINT",
            "S3_REGION",
            "S3_BUCKET",
            "S3_FORCE_PATH_STYLE",
            "S3_ACCESS_KEY",
            "S3_SECRET_KEY",
            "OIDC_ISSUER_URL",
            "OIDC_JWKS_URL",
            "OIDC_CLIENT_ID",
            "OIDC_AUDIENCE",
            "OIDC_REDIRECT_URI",
            "KEYCLOAK_BASE_URL",
            "KEYCLOAK_REALM",
            "KEYCLOAK_ADMIN_CLIENT_ID",
            "KEYCLOAK_ADMIN_CLIENT_SECRET",
        ):
            self.assertIn(key, env)
        self.assertEqual(env["OIDC_AUDIENCE"], f"http://127.0.0.1:{self.ports['api']}")
        self.assertEqual(env["OIDC_REDIRECT_URI"], f"http://localhost:{self.ports['web']}/auth/callback")
        self.assertTrue(env["OIDC_ISSUER_URL"].startswith(f"http://127.0.0.1:{self.ports['keycloak']}/"))

    def test_network_urls_use_compose_service_names(self) -> None:
        network = self.values["urls"]["network"]
        self.assertEqual(network["api"], "http://api:8080")
        self.assertEqual(network["web"], "http://web:5173")
        self.assertEqual(network["database"], "database:5432")

    def test_the_stack_file_body_is_valid_json_for_the_readers(self) -> None:
        json.dumps(self.values)


class StartupSequencingTests(unittest.TestCase):
    def test_database_preparation_overlaps_keycloak_readiness_and_web_starts_early(self) -> None:
        database_ready = threading.Event()
        build_ready = threading.Event()
        calls = []

        def compose(alloc, *args, **kwargs):
            calls.append(args)
            if args == ("build", "api"):
                self.assertTrue(database_ready.wait(2), "database work waited for the API build")
                build_ready.set()
            elif args == ("up", "-d", "--no-build", "api"):
                self.assertTrue(build_ready.is_set(), "API started before its build finished")
                self.assertTrue(database_ready.is_set(), "API started before database preparation")

        def healthy(alloc, services, timeout):
            if services == ("keycloak",):
                self.assertTrue(database_ready.wait(2), "database work waited for Keycloak")

        def database(alloc):
            database_ready.set()

        with TemporaryDirectory() as folder, \
                patch.object(up, "RENDERED_REALM_DIR", Path(folder)), \
                patch.object(up, "read_stack", return_value=None), \
                patch.object(sc, "allocate", return_value={"project": "slaydrip-test0001", "ports": sc.block_ports(0)}), \
                patch.object(sc, "write_stack_file"), \
                patch.object(up, "compose", side_effect=compose), \
                patch.object(up, "require_services_healthy", side_effect=healthy), \
                patch.object(up, "create_test_database", side_effect=database), \
                patch.object(up, "ensure_bucket") as bucket, \
                patch.object(up, "_probe_keycloak", return_value=(True, "")) as keycloak, \
                patch.object(up, "_probe", return_value=(True, "")) as probe:
            self.assertEqual(up.cmd_up(argparse.Namespace(budget=30)), 0)
        self.assertIn("web", calls[0])
        self.assertIn("--no-deps", calls[0])
        self.assertEqual(calls[2], ("up", "-d", "--no-build", "api"))
        bucket.assert_called_once()
        keycloak.assert_called_once()
        self.assertEqual(probe.call_count, 2)


class ComposeJsonTests(unittest.TestCase):
    def test_parses_one_object_per_line(self) -> None:
        text = '{"Service":"database","State":"running","Health":"healthy"}\n{"Service":"keycloak","State":"running"}\n'
        rows = up.parse_compose_json(text)
        self.assertEqual([r["Service"] for r in rows], ["database", "keycloak"])

    def test_parses_a_json_array(self) -> None:
        rows = up.parse_compose_json('[{"Service":"api","State":"exited"}]')
        self.assertEqual(rows[0]["State"], "exited")

    def test_empty_output_is_no_containers(self) -> None:
        self.assertEqual(up.parse_compose_json("  \n"), [])


class NameTests(unittest.TestCase):
    def test_database_names_are_plain_identifiers(self) -> None:
        self.assertIsNotNone(up.DATABASE_NAME_RE.match("slaydrip_test"))
        self.assertIsNone(up.DATABASE_NAME_RE.match("slaydrip; drop database slaydrip"))
        self.assertIsNone(up.DATABASE_NAME_RE.match("Slaydrip"))

    def test_network_database_url_names_the_compose_service(self) -> None:
        url = up.network_database_url("slaydrip_template")
        self.assertIn("@database:5432/slaydrip_template", url)


if __name__ == "__main__":
    unittest.main()
