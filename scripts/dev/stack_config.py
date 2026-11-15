#!/usr/bin/env python3
"""Per-worktree local stack allocation: compose project name, host ports and the stack file.

Governed by ADR-0016 and S1-08.04. Pure logic: this module never calls docker and never
starts a container. It derives, for one absolute worktree path:

- a compose project name, ``slaydrip-<8 hex of the path hash>``;
- a block of five host ports (PostgreSQL, S3, Keycloak, API, web) from base 20000 in
  steps of 10, so blocks never overlap. A block whose ports are taken moves to the next
  block, and the whole block shifts together.

It also reads and writes ``.stack/stack.json`` in the worktree (gitignored). Only the
allocation part of the contract (``project`` and ``ports``) is validated here; the other
keys are written by up.py (S1-08.09).

Standard library only. Run from anywhere:

    python scripts/dev/stack_config.py                      # print this worktree's allocation
    python scripts/dev/stack_config.py --project my-stack   # override the project name
    python scripts/dev/stack_config.py --write              # also write .stack/stack.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import socket
import sys
import tempfile
from pathlib import Path
from typing import Callable, Mapping, Optional

# Fixed container-side ports. compose.yaml maps the host ports from the block to these.
SERVICE_PORTS: dict[str, int] = {
    "postgres": 5432,
    "s3": 8333,
    "keycloak": 8180,
    "api": 8080,
    "web": 5173,
}
PORT_NAMES: tuple[str, ...] = tuple(SERVICE_PORTS)

PORT_BASE = 20000
PORT_STEP = 10
BLOCK_COUNT = 1000  # 20000 .. 29990 in steps of 10

PROJECT_PREFIX = "slaydrip-"
PROJECT_HEX_LENGTH = 8
_PROJECT_RE = re.compile(r"^[a-z0-9][a-z0-9_-]*$")

STACK_DIR_NAME = ".stack"
STACK_FILE_NAME = "stack.json"
STACK_FILE_ENV = "SLAYDRIP_STACK_FILE"

Allocation = dict  # {"project": str, "ports": {name: int}, "block_index": int, "shifts": int}


class StackConfigError(Exception):
    """Raised for an invalid override, a missing or malformed stack file, or no free block."""


def default_worktree_root() -> Path:
    """The worktree that contains this script (scripts/dev/ sits two levels below the root)."""
    return Path(__file__).resolve().parents[2]


def canonical_worktree_path(path: str | os.PathLike[str], *, windows: Optional[bool] = None) -> str:
    """Return the canonical absolute path used for hashing.

    Resolves symlinks and relative parts. On Windows the path is case-normalised (lower
    case, backslashes), so ``C:\\Repo`` and ``c:\\repo`` give the same project and ports.
    ``windows`` defaults to ``sys.platform == "win32"`` and exists so tests can exercise
    the Windows rule on any OS.
    """
    if windows is None:
        windows = sys.platform == "win32"
    resolved = os.path.realpath(os.path.abspath(os.fspath(path)))
    if windows:
        return os.path.normcase(resolved).lower()
    return resolved


def path_digest(path: str | os.PathLike[str], *, windows: Optional[bool] = None) -> str:
    """SHA-256 hex digest of the canonical worktree path."""
    canonical = canonical_worktree_path(path, windows=windows)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def derive_project_name(path: str | os.PathLike[str], *, windows: Optional[bool] = None) -> str:
    """Compose project name for a worktree: ``slaydrip-`` plus 8 hex characters of the hash."""
    return PROJECT_PREFIX + path_digest(path, windows=windows)[:PROJECT_HEX_LENGTH]


def validate_project_name(name: str) -> str:
    """Accept only names compose allows: lower case letters, digits, hyphen, underscore."""
    if not isinstance(name, str) or not _PROJECT_RE.match(name):
        raise StackConfigError(
            f"invalid compose project name {name!r}: use lower case letters, digits, '-' or '_', "
            "starting with a letter or digit"
        )
    return name


def derive_block_index(path: str | os.PathLike[str], *, windows: Optional[bool] = None) -> int:
    """Index of the first candidate port block for a worktree (0 .. BLOCK_COUNT - 1).

    Uses hash bytes 8..16, so it does not simply repeat the project-name hex.
    """
    digest = path_digest(path, windows=windows)
    return int(digest[PROJECT_HEX_LENGTH : PROJECT_HEX_LENGTH + 8], 16) % BLOCK_COUNT


def block_ports(block_index: int) -> dict[str, int]:
    """The five host ports for one block, in PORT_NAMES order."""
    if not 0 <= block_index < BLOCK_COUNT:
        raise StackConfigError(f"block index {block_index} is outside 0..{BLOCK_COUNT - 1}")
    base = PORT_BASE + block_index * PORT_STEP
    return {name: base + offset for offset, name in enumerate(PORT_NAMES)}


def is_port_free(port: int, host: str = "127.0.0.1") -> bool:
    """True when nothing is listening on the host port (a bind attempt succeeds)."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        try:
            probe.bind((host, port))
        except OSError:
            return False
    return True


def allocate(
    path: str | os.PathLike[str],
    *,
    project: Optional[str] = None,
    existing: Optional[Mapping[str, object]] = None,
    is_free: Callable[[int], bool] = is_port_free,
    windows: Optional[bool] = None,
) -> Allocation:
    """Allocate the project name and port block for a worktree.

    - ``project`` overrides the derived project name (validated).
    - ``existing`` is a previously written stack file. When its project matches the
      derived or overridden project and its ports are a valid block, that block is reused
      without probing, because the running stack holds those ports.
    - Otherwise the block is probed from the derived index; a block with any taken port
      is skipped and the next block is tried, wrapping around, until a free one is found.
    """
    name = validate_project_name(project) if project is not None else derive_project_name(
        path, windows=windows
    )

    if existing is not None and existing.get("project") == name:
        reused = _ports_from_mapping(existing.get("ports"))
        if reused is not None:
            index = _block_index_of(reused)
            if index is not None:
                return {"project": name, "ports": reused, "block_index": index, "shifts": 0}

    start = derive_block_index(path, windows=windows)
    for shift in range(BLOCK_COUNT):
        index = (start + shift) % BLOCK_COUNT
        ports = block_ports(index)
        if all(is_free(port) for port in ports.values()):
            return {"project": name, "ports": ports, "block_index": index, "shifts": shift}
    raise StackConfigError("no free port block: all 1000 blocks have a port in use")


def _ports_from_mapping(value: object) -> Optional[dict[str, int]]:
    if not isinstance(value, Mapping):
        return None
    ports: dict[str, int] = {}
    for name in PORT_NAMES:
        port = value.get(name)
        if not isinstance(port, int) or isinstance(port, bool):
            return None
        ports[name] = port
    return ports


def _block_index_of(ports: Mapping[str, int]) -> Optional[int]:
    """Block index for a port set, or None when it is not an aligned block."""
    base = ports[PORT_NAMES[0]]
    offset = base - PORT_BASE
    if offset < 0 or offset % PORT_STEP != 0:
        return None
    index = offset // PORT_STEP
    if index >= BLOCK_COUNT:
        return None
    if block_ports(index) != dict(ports):
        return None
    return index


def stack_dir(worktree: str | os.PathLike[str]) -> Path:
    """The ``.stack`` directory under the worktree root. It is created on write, not here."""
    return Path(worktree) / STACK_DIR_NAME


def stack_file_path(
    worktree: str | os.PathLike[str], environ: Optional[Mapping[str, str]] = None
) -> Path:
    """Path of stack.json: ``SLAYDRIP_STACK_FILE`` when set, else ``<worktree>/.stack/stack.json``."""
    env = os.environ if environ is None else environ
    override = env.get(STACK_FILE_ENV, "").strip()
    if override:
        return Path(override)
    return stack_dir(worktree) / STACK_FILE_NAME


def validate_allocation(data: object) -> dict:
    """Check the allocation part of the stack file contract (``project`` and ``ports``)."""
    if not isinstance(data, dict):
        raise StackConfigError("stack file must be a JSON object")
    validate_project_name(data.get("project"))  # type: ignore[arg-type]
    if _ports_from_mapping(data.get("ports")) is None:
        raise StackConfigError(
            f"stack file 'ports' must map {', '.join(PORT_NAMES)} to integers"
        )
    return data


def write_stack_file(
    worktree: str | os.PathLike[str],
    data: Mapping[str, object],
    environ: Optional[Mapping[str, str]] = None,
) -> Path:
    """Write stack.json atomically (temp file, then replace), creating ``.stack/`` if needed."""
    validate_allocation(dict(data))
    target = stack_file_path(worktree, environ)
    target.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, indent=2, sort_keys=True) + "\n"
    fd, tmp_name = tempfile.mkstemp(dir=str(target.parent), prefix=".stack-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        os.replace(tmp_name, target)
    except BaseException:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
        raise
    return target


def read_stack_file(
    worktree: str | os.PathLike[str], environ: Optional[Mapping[str, str]] = None
) -> dict:
    """Read and validate stack.json. Fails with a clear message when it is missing."""
    source = stack_file_path(worktree, environ)
    if not source.is_file():
        raise StackConfigError(
            f"stack file not found at {source}; start the stack with "
            "'python scripts/dev/up.py up' first"
        )
    try:
        data = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise StackConfigError(f"stack file {source} is not readable JSON: {error}") from error
    return validate_allocation(data)


def read_existing_or_none(
    worktree: str | os.PathLike[str], environ: Optional[Mapping[str, str]] = None
) -> Optional[dict]:
    """Previous allocation for reuse, or None when there is no usable stack file."""
    try:
        return read_stack_file(worktree, environ)
    except StackConfigError:
        return None


def _cli(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--worktree", default=None, help="worktree root (default: this checkout)")
    parser.add_argument("--project", default=None, help="override the derived project name")
    parser.add_argument("--write", action="store_true", help="write .stack/stack.json")
    args = parser.parse_args(argv)

    worktree = Path(args.worktree) if args.worktree else default_worktree_root()
    try:
        existing = read_existing_or_none(worktree)
        result = allocate(worktree, project=args.project, existing=existing)
        if args.write:
            payload = {"project": result["project"], "ports": result["ports"]}
            written = write_stack_file(worktree, payload)
            print(f"wrote {written}", file=sys.stderr)
    except StackConfigError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(json.dumps({"project": result["project"], "ports": result["ports"]}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(_cli())
