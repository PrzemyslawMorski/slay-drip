#!/usr/bin/env python3
"""Per-worktree local stack: start, check, test database, e2e run and teardown (ADR-0016, S1-08.09).

    python scripts/dev/up.py up [--budget SECONDS]     start this worktree's stack and check it
    python scripts/dev/up.py down                      stop the stack and remove its volumes
    python scripts/dev/up.py status                    show the services and the stack file
    python scripts/dev/up.py sql --database NAME --query SQL
    python scripts/dev/up.py e2e [-- ARGS...]          run the Playwright suite against the stack

Only this script calls docker for the local stack (ADR-0014). Standard library only. It reads no
environment file: every local value comes from compose.yaml, infra/dev/ or the stack file
it writes to .stack/stack.json (gitignored).

The compose project name and host ports come from scripts/dev/stack_config.py, so two worktrees
never share a project, a port or a database. The dev database "slaydrip" is never used by tests.
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path
from typing import Callable, Iterator, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stack_config as sc  # noqa: E402

REPO_ROOT = sc.default_worktree_root()
COMPOSE_FILE = REPO_ROOT / "compose.yaml"
REALM_TEMPLATE = REPO_ROOT / "infra" / "dev" / "keycloak" / "realm" / "slay-drip-realm.json"
RENDERED_REALM_DIR = REPO_ROOT / ".stack" / "keycloak" / "realm"
S3_SMOKE = REPO_ROOT / "scripts" / "dev" / "s3_smoke.py"
FRONTEND = REPO_ROOT / "frontend"

REALM_NAME = "slay-drip"
PWA_CLIENT = "slay-drip-pwa"
ADMIN_CLIENT = "slay-drip-backend-admin"
TEST_USERNAME = "persona.menswear@example.test"

# Throwaway local values for the local stand-ins only. DB_PASSWORD must match compose.yaml.
DB_USER = "slaydrip"
DB_PASSWORD = "slaydrip-local-secret"
DEV_DATABASE = "slaydrip"
TEST_DATABASE = "slaydrip_test"
TEMPLATE_DATABASE = "slaydrip_template"
S3_BUCKET = "slay-drip-local"
S3_REGION = "fr-par"
S3_ACCESS_KEY = "slaydrip-local"
S3_SECRET_KEY = "slaydrip-local-secret"
MIGRATE_VERSION = "v4.20.1"

# Service name in stack.json -> compose interpolation variable.
PORT_VARS = {
    "postgres": "SLAYDRIP_PORT_POSTGRES",
    "s3": "SLAYDRIP_PORT_S3",
    "keycloak": "SLAYDRIP_PORT_KEYCLOAK",
    "api": "SLAYDRIP_PORT_API",
    "web": "SLAYDRIP_PORT_WEB",
}
HEALTH_CHECKED = ("database", "keycloak")
DATABASE_NAME_RE = re.compile(r"^[a-z_][a-z0-9_]{0,62}$")

_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


class UpError(Exception):
    """A step failed. The message is printed as the one error line, with detail after it."""


# ---------------------------------------------------------------- output and timing


class Timer:
    """Records the wall-clock seconds of each step. Build time is kept apart (ADR-0016)."""

    def __init__(self) -> None:
        self.started = time.monotonic()
        self.steps: dict[str, float] = {}
        self.build_seconds = 0.0

    def total(self) -> float:
        return round(time.monotonic() - self.started, 1)

    @contextmanager
    def step(self, name: str, build: bool = False) -> Iterator[None]:
        print(f"-> {name}", flush=True)
        began = time.monotonic()
        try:
            yield
        finally:
            took = round(time.monotonic() - began, 1)
            if build:
                self.build_seconds = took
            else:
                self.steps[name] = took
            print(f"   {name}: {took} s", flush=True)


def tail(text: str, lines: int = 12) -> str:
    kept = [line for line in (text or "").splitlines() if line.strip()]
    return "\n".join(kept[-lines:])


def wait_for(
    description: str,
    check: Callable[[], tuple[bool, str]],
    timeout: float,
    interval: float = 2.0,
) -> None:
    """Poll check() until it returns True. Raises UpError with the last detail on timeout."""
    deadline = time.monotonic() + timeout
    last_print = time.monotonic()
    detail = ""
    while True:
        try:
            ok, detail = check()
        except UpError as error:
            ok, detail = False, str(error)
        if ok:
            return
        now = time.monotonic()
        if now >= deadline:
            raise UpError(f"timed out after {int(timeout)} s waiting for {description}: {detail}")
        if now - last_print >= 30:
            print(f"   still waiting for {description}", flush=True)
            last_print = now
        time.sleep(interval)


# ---------------------------------------------------------------- stack file and allocation


def read_stack(required: bool = True) -> Optional[dict]:
    try:
        return sc.read_stack_file(REPO_ROOT)
    except sc.StackConfigError as error:
        if required:
            raise UpError(str(error)) from error
        return None


def allocation_for_compose(existing: Optional[dict]) -> dict:
    """Project and ports for compose. Without a stack file, down uses the derived block without probing."""
    if existing is not None:
        return {"project": existing["project"], "ports": existing["ports"]}
    index = sc.derive_block_index(REPO_ROOT)
    return {"project": sc.derive_project_name(REPO_ROOT), "ports": sc.block_ports(index)}


def compose_env(alloc: dict) -> dict[str, str]:
    env = dict(os.environ)
    for name, var in PORT_VARS.items():
        env[var] = str(alloc["ports"][name])
    return env


def compose(
    alloc: dict,
    *args: str,
    capture: bool = True,
    check: bool = True,
    timeout: float = 600,
) -> subprocess.CompletedProcess:
    """Run docker compose for this worktree's project. Output is captured unless capture is False."""
    cmd = ["docker", "compose", "-f", str(COMPOSE_FILE), "-p", alloc["project"], *args]
    try:
        proc = subprocess.run(
            cmd,
            cwd=REPO_ROOT,
            env=compose_env(alloc),
            capture_output=capture,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
        )
    except FileNotFoundError as error:
        raise UpError("docker was not found on PATH; install Docker Desktop or Docker Engine") from error
    except subprocess.TimeoutExpired as error:
        raise UpError(f"docker compose {' '.join(args[:2])} timed out after {int(timeout)} s") from error
    if check and proc.returncode != 0:
        detail = tail((proc.stderr or "") + "\n" + (proc.stdout or ""))
        raise UpError(f"docker compose {' '.join(args[:2])} failed (exit {proc.returncode}):\n{detail}")
    return proc


def parse_compose_json(text: str) -> list[dict]:
    """`docker compose ps --format json` prints an array in some releases and one object per line in others."""
    trimmed = (text or "").strip()
    if not trimmed:
        return []
    if trimmed.startswith("["):
        return [row for row in json.loads(trimmed) if isinstance(row, dict)]
    return [json.loads(line) for line in trimmed.splitlines() if line.strip()]


def service_rows(alloc: dict) -> dict[str, dict]:
    proc = compose(alloc, "ps", "--all", "--format", "json", check=False)
    return {row.get("Service", ""): row for row in parse_compose_json(proc.stdout)}


def require_services_healthy(alloc: dict, services: tuple[str, ...], timeout: float) -> None:
    def check() -> tuple[bool, str]:
        rows = service_rows(alloc)
        pending = []
        for name in services:
            row = rows.get(name)
            if row is None:
                pending.append(f"{name} not created")
                continue
            state = row.get("State", "")
            health = row.get("Health", "")
            if state != "running":
                pending.append(f"{name} is {state or 'not running'}")
            elif name in HEALTH_CHECKED and health != "healthy":
                pending.append(f"{name} is {health or 'not healthy yet'}")
        return (not pending, "; ".join(pending))

    wait_for(f"{', '.join(services)} to be healthy", check, timeout)


# ---------------------------------------------------------------- HTTP helpers


def http(
    method: str,
    url: str,
    *,
    data: Optional[bytes] = None,
    headers: Optional[dict[str, str]] = None,
    timeout: float = 10,
) -> tuple[int, bytes]:
    """Return (status, body) for any HTTP status. Raises UpError when the host cannot be reached."""
    request = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with _OPENER.open(request, timeout=timeout) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()
    except (urllib.error.URLError, OSError) as error:
        raise UpError(f"{url} is not reachable yet: {getattr(error, 'reason', error)}") from error


def http_json(method: str, url: str, **kwargs: object) -> object:
    status, body = http(method, url, **kwargs)  # type: ignore[arg-type]
    if status != 200:
        raise UpError(f"{url} answered HTTP {status}")
    return json.loads(body.decode("utf-8"))


# ---------------------------------------------------------------- realm and stack values


def load_realm_template() -> dict:
    try:
        return json.loads(REALM_TEMPLATE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise UpError(f"cannot read the realm template {REALM_TEMPLATE}: {error}") from error


def render_realm(template: dict, web_port: int, api_port: int) -> dict:
    """The committed realm with this worktree's web origin and API audience (ADR-0016)."""
    web = f"http://localhost:{web_port}"
    api = f"http://127.0.0.1:{api_port}"
    realm = copy.deepcopy(template)
    clients = [c for c in realm.get("clients", []) if c.get("clientId") == PWA_CLIENT]
    if len(clients) != 1:
        raise UpError(f"the realm template must have exactly one {PWA_CLIENT} client")
    client = clients[0]
    client["redirectUris"] = [f"{web}/auth/callback"]
    client["webOrigins"] = [web]
    client.setdefault("attributes", {})["post.logout.redirect.uris"] = f"{web}/"
    mappers = [m for m in client.get("protocolMappers", []) if m.get("protocolMapper") == "oidc-audience-mapper"]
    if len(mappers) != 1:
        raise UpError("the PWA client must have exactly one audience mapper")
    mappers[0].setdefault("config", {})["included.custom.audience"] = api
    return realm


def realm_secret(template: dict, client_id: str) -> str:
    for client in template.get("clients", []):
        if client.get("clientId") == client_id and client.get("secret"):
            return str(client["secret"])
    raise UpError(f"the realm template has no secret for client {client_id}")


def realm_user_password(template: dict, username: str) -> str:
    for user in template.get("users", []):
        if user.get("username") == username:
            for credential in user.get("credentials", []):
                if credential.get("type") == "password" and credential.get("value"):
                    return str(credential["value"])
    raise UpError(f"the realm template has no password for the synthetic user {username}")


def build_stack_values(alloc: dict, template: dict) -> dict:
    """The stack file body: ports, URLs, the config-contract env and the test database URL."""
    ports = alloc["ports"]
    web = f"http://localhost:{ports['web']}"
    api = f"http://127.0.0.1:{ports['api']}"
    keycloak = f"http://127.0.0.1:{ports['keycloak']}"
    s3 = f"http://127.0.0.1:{ports['s3']}"
    env = {
        "S3_ENDPOINT": s3,
        "S3_REGION": S3_REGION,
        "S3_BUCKET": S3_BUCKET,
        "S3_FORCE_PATH_STYLE": "true",
        "S3_ACCESS_KEY": S3_ACCESS_KEY,
        "S3_SECRET_KEY": S3_SECRET_KEY,
        "OIDC_ISSUER_URL": f"{keycloak}/realms/{REALM_NAME}",
        "OIDC_JWKS_URL": f"{keycloak}/realms/{REALM_NAME}/protocol/openid-connect/certs",
        "OIDC_CLIENT_ID": PWA_CLIENT,
        "OIDC_AUDIENCE": api,
        "OIDC_REDIRECT_URI": f"{web}/auth/callback",
        "KEYCLOAK_BASE_URL": keycloak,
        "KEYCLOAK_REALM": REALM_NAME,
        "KEYCLOAK_ADMIN_CLIENT_ID": ADMIN_CLIENT,
        "KEYCLOAK_ADMIN_CLIENT_SECRET": realm_secret(template, ADMIN_CLIENT),
        "TEST_USERNAME": TEST_USERNAME,
        "TEST_PASSWORD": realm_user_password(template, TEST_USERNAME),
    }
    return {
        "project": alloc["project"],
        "ports": dict(ports),
        "urls": {
            "host": {"web": web, "api": api, "keycloak": keycloak, "s3": s3},
            "network": {
                "web": "http://web:5173",
                "api": "http://api:8080",
                "keycloak": "http://keycloak:8080",
                "s3": "http://object-storage:8333",
                "database": "database:5432",
            },
        },
        "env": env,
        "test_database_url": database_url(TEST_DATABASE, ports["postgres"]),
    }


def database_url(name: str, host_port: int) -> str:
    return f"postgres://{DB_USER}:{DB_PASSWORD}@127.0.0.1:{host_port}/{name}?sslmode=disable"


def network_database_url(name: str) -> str:
    return f"postgres://{DB_USER}:{DB_PASSWORD}@database:5432/{name}?sslmode=disable"


# ---------------------------------------------------------------- database and migrations


def sql(alloc: dict, database: str, query: str) -> str:
    """Run one statement with psql inside the database container. Output is unaligned, tab-separated."""
    proc = compose(
        alloc,
        "exec",
        "-T",
        "database",
        "psql",
        "-U",
        DB_USER,
        "-d",
        database,
        "-X",
        "-v",
        "ON_ERROR_STOP=1",
        "-At",
        "-F",
        "\t",
        "-c",
        query,
    )
    return proc.stdout


def migrate(alloc: dict, database: str) -> None:
    """Apply backend/migrations with the pinned golang-migrate, from the go tool service on the stack network.

    The database URL goes through the container environment, so it is not in the command line text.
    """
    command = (
        "go run -tags postgres github.com/golang-migrate/migrate/v4/cmd/migrate@"
        f"{MIGRATE_VERSION} -path migrations -database \"$DATABASE_URL\" up"
    )
    compose(
        alloc,
        "run",
        "--rm",
        "-T",
        "-e",
        f"DATABASE_URL={network_database_url(database)}",
        "go",
        "sh",
        "-c",
        command,
        timeout=900,
    )


def create_test_database(alloc: dict) -> None:
    """Build a migrated template, copy it to slaydrip_test (fresh on every up) and keep the dev DB migrated.

    The tests never use the dev database. It is migrated only so that it has the current schema.
    """
    maintenance = "postgres"
    sql(alloc, maintenance, f"DROP DATABASE IF EXISTS {TEST_DATABASE} WITH (FORCE)")
    sql(alloc, maintenance, f"DROP DATABASE IF EXISTS {TEMPLATE_DATABASE} WITH (FORCE)")
    sql(alloc, maintenance, f"CREATE DATABASE {TEMPLATE_DATABASE}")
    migrate(alloc, TEMPLATE_DATABASE)
    sql(alloc, maintenance, f"CREATE DATABASE {TEST_DATABASE} TEMPLATE {TEMPLATE_DATABASE}")
    state = sql(alloc, TEST_DATABASE, "SELECT version, dirty FROM schema_migrations").strip()
    if not state:
        raise UpError(f"{TEST_DATABASE} has no migrations applied")
    version, dirty = state.split("\t")[:2]
    if dirty != "f":
        raise UpError(f"{TEST_DATABASE} is at migration {version} but marked dirty")
    print(f"   {TEST_DATABASE} is at migration {version}", flush=True)
    migrate(alloc, DEV_DATABASE)


# ---------------------------------------------------------------- S3 and Keycloak checks


def ensure_bucket(values: dict) -> None:
    """Create the dev bucket and round-trip one object, with scripts/dev/s3_smoke.py (its OK line is checked)."""
    env = dict(os.environ)
    env.update(
        {
            "S3_ENDPOINT": values["urls"]["host"]["s3"],
            "S3_REGION": S3_REGION,
            "S3_BUCKET": S3_BUCKET,
            "S3_ACCESS_KEY": S3_ACCESS_KEY,
            "S3_SECRET_KEY": S3_SECRET_KEY,
            "S3_FORCE_PATH_STYLE": "true",
        }
    )

    def check() -> tuple[bool, str]:
        proc = subprocess.run(
            [sys.executable, str(S3_SMOKE)],
            cwd=REPO_ROOT,
            env=env,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
            check=False,
        )
        if proc.returncode == 0 and "OK: S3 round-trip passed" in proc.stdout:
            return True, ""
        return False, tail(proc.stderr or proc.stdout, 3)

    wait_for("the S3 stand-in to answer", check, timeout=180, interval=3)


def check_keycloak(values: dict, template: dict) -> None:
    """Discovery answers with this worktree's issuer, and the synthetic test user exists in the realm."""
    keycloak = values["urls"]["host"]["keycloak"]
    issuer = f"{keycloak}/realms/{REALM_NAME}"
    discovery = http_json("GET", f"{issuer}/.well-known/openid-configuration")
    if not isinstance(discovery, dict) or discovery.get("issuer") != issuer:
        raise UpError("Keycloak discovery does not name this worktree's issuer")

    secret = realm_secret(template, ADMIN_CLIENT)
    token_body = urllib.parse.urlencode(
        {"grant_type": "client_credentials", "client_id": ADMIN_CLIENT, "client_secret": secret}
    ).encode()
    token = http_json(
        "POST",
        f"{issuer}/protocol/openid-connect/token",
        data=token_body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    access = token.get("access_token") if isinstance(token, dict) else None
    if not access:
        raise UpError("the admin client did not receive a token")
    query = urllib.parse.urlencode({"username": TEST_USERNAME, "exact": "true"})
    users = http_json(
        "GET",
        f"{keycloak}/admin/realms/{REALM_NAME}/users?{query}",
        headers={"Authorization": f"Bearer {access}"},
    )
    if not (isinstance(users, list) and len(users) == 1 and users[0].get("enabled") is True):
        raise UpError(f"the synthetic test user {TEST_USERNAME} is not an enabled realm user")


# ---------------------------------------------------------------- commands


def cmd_up(args: argparse.Namespace) -> int:
    timer = Timer()
    template = load_realm_template()
    existing = read_stack(required=False)
    with timer.step("allocate ports"):
        result = sc.allocate(REPO_ROOT, project=None, existing=existing)
        alloc = {"project": result["project"], "ports": result["ports"]}
        print(f"   project {alloc['project']}, web port {alloc['ports']['web']}", flush=True)

    values = build_stack_values(alloc, template)
    with timer.step("render realm and write stack file"):
        rendered = render_realm(template, alloc["ports"]["web"], alloc["ports"]["api"])
        RENDERED_REALM_DIR.mkdir(parents=True, exist_ok=True)
        (RENDERED_REALM_DIR / "slay-drip-realm.json").write_text(
            json.dumps(rendered, indent=2) + "\n", encoding="utf-8", newline="\n"
        )
        sc.write_stack_file(REPO_ROOT, values)

    with timer.step("start database, object storage, keycloak and web"):
        compose(alloc, "up", "-d", "--no-build", "--no-deps", "database", "object-storage", "keycloak", "web", timeout=900)

    def build_api() -> None:
        with timer.step("build api image (cache hit is quick)", build=True):
            compose(alloc, "build", "api", capture=False, timeout=3600)

    def prepare_database_and_api() -> None:
        with timer.step("wait for database to be healthy"):
            require_services_healthy(alloc, ("database",), timeout=300)
        with timer.step("create and migrate the test and dev databases"):
            create_test_database(alloc)
        api_build.result()
        with timer.step("start api"):
            compose(alloc, "up", "-d", "--no-build", "api", timeout=900)

    def prepare_s3() -> None:
        with timer.step("create the S3 bucket"):
            ensure_bucket(values)

    def prepare_keycloak() -> None:
        with timer.step("wait for keycloak to be healthy"):
            require_services_healthy(alloc, ("keycloak",), timeout=300)
        with timer.step("check keycloak and the synthetic test user"):
            wait_for("keycloak discovery", lambda: _probe_keycloak(values, template), timeout=120)

    with ThreadPoolExecutor(max_workers=4) as executor:
        api_build = executor.submit(build_api)
        futures = [executor.submit(task) for task in (prepare_database_and_api, prepare_s3, prepare_keycloak)]
        for future in futures:
            future.result()

    with timer.step("wait for the api and the web dev server"):
        api_url = f"{values['urls']['host']['api']}/healthz"
        web_url = f"http://127.0.0.1:{alloc['ports']['web']}/"
        wait_for("the API /healthz", lambda: _probe(api_url), timeout=180)
        wait_for("the web dev server (first start installs npm packages in its container)", lambda: _probe(web_url), timeout=1200, interval=3)

    total = timer.total()
    values["last_up"] = {
        "total_seconds": total,
        "build_seconds": timer.build_seconds,
        "steps": timer.steps,
    }
    sc.write_stack_file(REPO_ROOT, values)

    print("", flush=True)
    print(f"web   {values['urls']['host']['web']}", flush=True)
    print(f"api   {values['urls']['host']['api']}", flush=True)
    print(f"keycloak {values['urls']['host']['keycloak']}", flush=True)
    print(f"test database {TEST_DATABASE} (user {TEST_USERNAME}, password in the stack file)", flush=True)
    print(f"timing: {total} s total (including build), build {timer.build_seconds} s", flush=True)
    if args.budget is not None and total > args.budget:
        raise UpError(f"over budget: {total} s is more than {args.budget} s")
    print(f"OK: local stack is up for {alloc['project']}", flush=True)
    return 0


def _probe(url: str) -> tuple[bool, str]:
    status, _ = http("GET", url, timeout=10)
    return status == 200, f"HTTP {status}"


def _probe_keycloak(values: dict, template: dict) -> tuple[bool, str]:
    check_keycloak(values, template)
    return True, ""


def cmd_down(_: argparse.Namespace) -> int:
    alloc = allocation_for_compose(read_stack(required=False))
    compose(alloc, "down", "-v", "--remove-orphans", capture=False, timeout=900)
    print(f"OK: stack {alloc['project']} is down and its volumes are removed", flush=True)
    return 0


def cmd_status(_: argparse.Namespace) -> int:
    existing = read_stack(required=False)
    alloc = allocation_for_compose(existing)
    if existing is None:
        print("no stack file: this worktree has not been started (python scripts/dev/up.py up)")
    else:
        print(f"project {alloc['project']}, ports {json.dumps(alloc['ports'])}")
    proc = compose(alloc, "ps", "--all", check=False, capture=True)
    print(proc.stdout.rstrip() if proc.stdout.strip() else "no containers for this project")
    if existing is not None:
        for name in ("web", "api"):
            url = existing["urls"]["host"][name] + ("/healthz" if name == "api" else "/")
            try:
                status, _ = http("GET", url, timeout=3)
                print(f"{name}: HTTP {status} at {url}")
            except UpError as error:
                print(f"{name}: not answering ({error})")
    return 0


def cmd_sql(args: argparse.Namespace) -> int:
    if not DATABASE_NAME_RE.match(args.database):
        raise UpError(f"invalid database name {args.database!r}")
    stack = read_stack(required=True)
    output = sql(stack, args.database, args.query)
    sys.stdout.write(output)
    return 0


def cmd_e2e(args: argparse.Namespace) -> int:
    stack = read_stack(required=True)
    urls = stack["urls"]["host"]
    for name, url in (("web", urls["web"] + "/"), ("api", urls["api"] + "/healthz")):
        try:
            status, _ = http("GET", url, timeout=5)
        except UpError as error:
            raise UpError(f"the {name} service is not answering; start the stack with up.py up ({error})") from error
        if status != 200:
            raise UpError(f"the {name} service answered HTTP {status}; start the stack with up.py up")

    npx = shutil.which("npx")
    if npx is None:
        raise UpError("npx was not found on PATH; install Node 22 on the host for the Playwright run")
    if not (FRONTEND / "node_modules").is_dir():
        raise UpError("frontend/node_modules is missing; run npm ci in frontend/ first")

    env = compose_env({"project": stack["project"], "ports": stack["ports"]})
    env["COMPOSE_PROJECT_NAME"] = stack["project"]
    extra = [a for a in (args.extra or []) if a != "--"]
    for command in ([npx, "bddgen"], [npx, "playwright", "test", *extra]):
        proc = subprocess.run(command, cwd=FRONTEND, env=env, check=False)
        if proc.returncode != 0:
            return proc.returncode
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    sub = parser.add_subparsers(dest="command", required=True)

    up = sub.add_parser("up", help="start this worktree's stack and check it")
    up.add_argument("--budget", type=float, default=None, help="fail when the total exceeds this many seconds")
    up.set_defaults(func=cmd_up)

    down = sub.add_parser("down", help="stop the stack and remove its volumes")
    down.set_defaults(func=cmd_down)

    status = sub.add_parser("status", help="show services and the stack file")
    status.set_defaults(func=cmd_status)

    query = sub.add_parser("sql", help="run one SQL statement against a database of the stack")
    query.add_argument("--database", required=True)
    query.add_argument("--query", required=True)
    query.set_defaults(func=cmd_sql)

    e2e = sub.add_parser("e2e", help="run the Playwright suite against the stack")
    e2e.add_argument("extra", nargs=argparse.REMAINDER, help="extra arguments for playwright test, after --")
    e2e.set_defaults(func=cmd_e2e)
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except (UpError, sc.StackConfigError) as error:
        print(f"error: {error}", file=sys.stderr, flush=True)
        return 1
    except KeyboardInterrupt:
        print("interrupted", file=sys.stderr)
        return 130


if __name__ == "__main__":
    sys.exit(main())
