#!/usr/bin/env python3
"""Unit tests for scripts/dev/stack_config.py (S1-08.04, ADR-0016).

Run: python -m unittest scripts/dev/test_stack_config.py
Pure logic only: no docker, no stack. Port probing is injected, except one test that binds a
real socket on 127.0.0.1 to show the default probe sees a taken port.
"""

from __future__ import annotations

import json
import os
import socket
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import stack_config as sc  # noqa: E402

WORKTREE_A = os.path.join(os.sep, "work", "slay-drip", ".claude", "worktrees", "alpha")
WORKTREE_B = os.path.join(os.sep, "work", "slay-drip", ".claude", "worktrees", "beta")


def _all_free(_port: int) -> bool:
    return True


class ProjectNameTests(unittest.TestCase):
    def test_same_path_gives_same_project_name(self) -> None:
        first = sc.derive_project_name(WORKTREE_A)
        second = sc.derive_project_name(WORKTREE_A)
        self.assertEqual(first, second)

    def test_project_name_has_prefix_and_eight_hex_characters(self) -> None:
        name = sc.derive_project_name(WORKTREE_A)
        self.assertRegex(name, r"^slaydrip-[0-9a-f]{8}$")

    def test_two_paths_give_different_project_names(self) -> None:
        self.assertNotEqual(sc.derive_project_name(WORKTREE_A), sc.derive_project_name(WORKTREE_B))

    def test_windows_paths_differing_only_in_case_match(self) -> None:
        upper = r"C:\Repos\Slay-Drip\.claude\worktrees\Alpha"
        lower = r"c:\repos\slay-drip\.claude\worktrees\alpha"
        self.assertEqual(
            sc.canonical_worktree_path(upper, windows=True),
            sc.canonical_worktree_path(lower, windows=True),
        )
        self.assertEqual(
            sc.derive_project_name(upper, windows=True),
            sc.derive_project_name(lower, windows=True),
        )
        self.assertEqual(
            sc.allocate(upper, is_free=_all_free, windows=True)["ports"],
            sc.allocate(lower, is_free=_all_free, windows=True)["ports"],
        )

    def test_posix_paths_are_case_sensitive(self) -> None:
        self.assertNotEqual(
            sc.derive_project_name("/x/Alpha", windows=False),
            sc.derive_project_name("/x/alpha", windows=False),
        )

    def test_relative_path_is_resolved_to_absolute(self) -> None:
        absolute = os.path.abspath("some-worktree")
        self.assertEqual(
            sc.canonical_worktree_path("some-worktree", windows=False),
            sc.canonical_worktree_path(absolute, windows=False),
        )

    def test_override_project_name_is_used(self) -> None:
        result = sc.allocate(WORKTREE_A, project="my-stack_1", is_free=_all_free)
        self.assertEqual(result["project"], "my-stack_1")

    def test_invalid_override_project_name_is_rejected(self) -> None:
        for bad in ("", "Upper", "has space", "-leading", "dots.not.ok"):
            with self.subTest(bad=bad), self.assertRaises(sc.StackConfigError):
                sc.allocate(WORKTREE_A, project=bad, is_free=_all_free)

    def test_no_override_derives_the_project_name(self) -> None:
        result = sc.allocate(WORKTREE_A, project=None, is_free=_all_free)
        self.assertEqual(result["project"], sc.derive_project_name(WORKTREE_A))


class PortBlockTests(unittest.TestCase):
    def test_same_path_gives_same_ports(self) -> None:
        first = sc.allocate(WORKTREE_A, is_free=_all_free)
        second = sc.allocate(WORKTREE_A, is_free=_all_free)
        self.assertEqual(first["ports"], second["ports"])
        self.assertEqual(first["block_index"], second["block_index"])

    def test_block_has_five_named_ports_from_base_in_steps_of_ten(self) -> None:
        ports = sc.block_ports(0)
        self.assertEqual(
            ports,
            {"postgres": 20000, "s3": 20001, "keycloak": 20002, "api": 20003, "web": 20004},
        )
        self.assertEqual(sc.block_ports(1)["postgres"], 20010)
        self.assertEqual(sc.block_ports(999)["postgres"], 29990)

    def test_allocated_ports_are_inside_the_block_range(self) -> None:
        for path in (WORKTREE_A, WORKTREE_B):
            ports = sc.allocate(path, is_free=_all_free)["ports"]
            for port in ports.values():
                self.assertGreaterEqual(port, 20000)
                self.assertLessEqual(port, 29999)

    def test_two_paths_get_different_ports(self) -> None:
        a = sc.allocate(WORKTREE_A, is_free=_all_free)["ports"]
        b = sc.allocate(WORKTREE_B, is_free=_all_free)["ports"]
        self.assertTrue(set(a.values()).isdisjoint(b.values()))

    def test_blocks_never_share_a_port(self) -> None:
        seen: dict[int, int] = {}
        for index in range(sc.BLOCK_COUNT):
            for port in sc.block_ports(index).values():
                self.assertNotIn(port, seen, f"port {port} in block {index} and {seen.get(port)}")
                seen[port] = index
        self.assertEqual(len(seen), sc.BLOCK_COUNT * len(sc.PORT_NAMES))

    def test_block_index_out_of_range_is_rejected(self) -> None:
        with self.assertRaises(sc.StackConfigError):
            sc.block_ports(sc.BLOCK_COUNT)
        with self.assertRaises(sc.StackConfigError):
            sc.block_ports(-1)

    def test_taken_first_port_shifts_the_whole_block(self) -> None:
        start = sc.derive_block_index(WORKTREE_A)
        taken_port = sc.block_ports(start)["postgres"]

        result = sc.allocate(WORKTREE_A, is_free=lambda port: port != taken_port)

        self.assertEqual(result["block_index"], (start + 1) % sc.BLOCK_COUNT)
        self.assertEqual(result["shifts"], 1)
        self.assertEqual(result["ports"], sc.block_ports((start + 1) % sc.BLOCK_COUNT))
        self.assertTrue(set(result["ports"].values()).isdisjoint(sc.block_ports(start).values()))

    def test_any_taken_port_in_the_block_shifts_it(self) -> None:
        start = sc.derive_block_index(WORKTREE_A)
        last_port = sc.block_ports(start)["web"]
        result = sc.allocate(WORKTREE_A, is_free=lambda port: port != last_port)
        self.assertEqual(result["shifts"], 1)

    def test_shift_skips_several_taken_blocks(self) -> None:
        start = sc.derive_block_index(WORKTREE_A)
        taken = {sc.block_ports((start + k) % sc.BLOCK_COUNT)["api"] for k in range(3)}
        result = sc.allocate(WORKTREE_A, is_free=lambda port: port not in taken)
        self.assertEqual(result["shifts"], 3)

    def test_all_blocks_taken_raises(self) -> None:
        with self.assertRaises(sc.StackConfigError):
            sc.allocate(WORKTREE_A, is_free=lambda _port: False)

    def test_default_probe_sees_a_port_in_use(self) -> None:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
            listener.bind(("127.0.0.1", 0))
            listener.listen(1)
            port = listener.getsockname()[1]
            self.assertFalse(sc.is_port_free(port))
        self.assertTrue(sc.is_port_free(port))

    def test_existing_stack_ports_are_reused_without_probing(self) -> None:
        first = sc.allocate(WORKTREE_A, is_free=_all_free)
        existing = {"project": first["project"], "ports": first["ports"]}

        def refuse_all(_port: int) -> bool:
            raise AssertionError("a reused block must not be probed")

        again = sc.allocate(WORKTREE_A, existing=existing, is_free=refuse_all)
        self.assertEqual(again["ports"], first["ports"])
        self.assertEqual(again["shifts"], 0)

    def test_existing_ports_for_another_project_are_not_reused(self) -> None:
        other = sc.allocate(WORKTREE_B, is_free=_all_free)
        existing = {"project": other["project"], "ports": other["ports"]}
        result = sc.allocate(WORKTREE_A, existing=existing, is_free=_all_free)
        self.assertEqual(result["project"], sc.derive_project_name(WORKTREE_A))
        self.assertNotEqual(result["ports"], other["ports"])

    def test_malformed_existing_ports_are_ignored(self) -> None:
        derived = sc.allocate(WORKTREE_A, is_free=_all_free)
        bad = {"project": derived["project"], "ports": {"postgres": "20000"}}
        result = sc.allocate(WORKTREE_A, existing=bad, is_free=_all_free)
        self.assertEqual(result["ports"], derived["ports"])


class StackFileTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.worktree = Path(self._tmp.name) / "worktree"
        self.worktree.mkdir()

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _payload(self) -> dict:
        result = sc.allocate(self.worktree, is_free=_all_free)
        return {"project": result["project"], "ports": result["ports"]}

    def test_write_creates_stack_dir_under_worktree_and_round_trips(self) -> None:
        payload = self._payload()
        written = sc.write_stack_file(self.worktree, payload, environ={})
        self.assertEqual(written, self.worktree / ".stack" / "stack.json")
        self.assertTrue((self.worktree / ".stack").is_dir())
        self.assertEqual(sc.read_stack_file(self.worktree, environ={}), payload)

    def test_written_file_is_utf8_lf_json(self) -> None:
        sc.write_stack_file(self.worktree, self._payload(), environ={})
        raw = (self.worktree / ".stack" / "stack.json").read_bytes()
        self.assertNotIn(b"\r\n", raw)
        json.loads(raw.decode("utf-8"))

    def test_no_temp_files_are_left_behind(self) -> None:
        sc.write_stack_file(self.worktree, self._payload(), environ={})
        names = sorted(p.name for p in (self.worktree / ".stack").iterdir())
        self.assertEqual(names, ["stack.json"])

    def test_write_overwrites_previous_file(self) -> None:
        sc.write_stack_file(self.worktree, self._payload(), environ={})
        other = sc.allocate(WORKTREE_B, is_free=_all_free)
        sc.write_stack_file(
            self.worktree, {"project": other["project"], "ports": other["ports"]}, environ={}
        )
        self.assertEqual(sc.read_stack_file(self.worktree, environ={})["project"], other["project"])

    def test_read_missing_file_fails_with_clear_message(self) -> None:
        with self.assertRaises(sc.StackConfigError) as ctx:
            sc.read_stack_file(self.worktree, environ={})
        self.assertIn("not found", str(ctx.exception))
        self.assertIn("up.py up", str(ctx.exception))

    def test_read_invalid_json_fails(self) -> None:
        target = self.worktree / ".stack" / "stack.json"
        target.parent.mkdir()
        target.write_text("{not json", encoding="utf-8")
        with self.assertRaises(sc.StackConfigError):
            sc.read_stack_file(self.worktree, environ={})

    def test_write_rejects_incomplete_ports(self) -> None:
        with self.assertRaises(sc.StackConfigError):
            sc.write_stack_file(
                self.worktree, {"project": "slaydrip-0a1b2c3d", "ports": {"postgres": 20000}},
                environ={},
            )
        self.assertFalse((self.worktree / ".stack" / "stack.json").exists())

    def test_stack_file_env_override_sets_the_path(self) -> None:
        target = Path(self._tmp.name) / "elsewhere" / "custom.json"
        env = {sc.STACK_FILE_ENV: str(target)}
        self.assertEqual(sc.stack_file_path(self.worktree, env), target)
        sc.write_stack_file(self.worktree, self._payload(), environ=env)
        self.assertTrue(target.is_file())
        self.assertFalse((self.worktree / ".stack" / "stack.json").exists())
        self.assertEqual(sc.read_stack_file(self.worktree, environ=env)["project"], self._payload()["project"])

    def test_existing_or_none_returns_none_when_missing(self) -> None:
        self.assertIsNone(sc.read_existing_or_none(self.worktree, environ={}))

    def test_existing_file_feeds_reuse_in_allocate(self) -> None:
        payload = self._payload()
        sc.write_stack_file(self.worktree, payload, environ={})
        existing = sc.read_existing_or_none(self.worktree, environ={})
        result = sc.allocate(self.worktree, existing=existing, is_free=lambda _p: False)
        self.assertEqual(result["ports"], payload["ports"])


class ConstantsTests(unittest.TestCase):
    def test_service_ports_are_the_fixed_container_ports(self) -> None:
        self.assertEqual(
            sc.SERVICE_PORTS,
            {"postgres": 5432, "s3": 8333, "keycloak": 8180, "api": 8080, "web": 5173},
        )
        self.assertEqual(sc.PORT_NAMES, ("postgres", "s3", "keycloak", "api", "web"))


if __name__ == "__main__":
    unittest.main()
