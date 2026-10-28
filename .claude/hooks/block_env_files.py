"""PreToolUse hook: blocks any tool call that touches an env file.

Matches basenames: .env, .env.<anything>, .env*, *.env, .envrc, and dot-globs such as .en* that would match them.
Does NOT match source files such as environment.ts or vite-env.d.ts.
Registered for Bash and PowerShell (same command-text scan) and for the file tools.
Exit 2 = block the tool call; the stderr message is shown to Claude.
"""

import fnmatch
import json
import re
import sys

ENV_NAME = re.compile(r"(?i)^(\.env([.*].*)?|.*\.env|\.envrc)$")
SHELL_TOOLS = ("Bash", "PowerShell")


def remove_prose_arguments(command: str) -> str:
    # Message text is prose, not file access: a commit message or PR body may mention an env file by name.
    # Quoted heredocs (<<'EOF') and unexpanded -m / --title / --body values are removed before the scan.
    # Values with $ or a backtick are kept, because they can run commands such as $(cat <env file>).
    command = re.sub(r"(?s)<<\s*'(\w+)'\r?\n.*?\r?\n\s*\1\b", " ", command)
    return re.sub(r'(?<=\s)(?:-m|--message|--title|--body)(?:\s+|=)"[^"$`]*"', " ", command)


def is_dot_glob_for_env(leaf: str) -> bool:
    # A dot-glob such as .en* expands to .env in the shell, so test the wildcard against the env names too.
    if not leaf.startswith(".") or not any(c in leaf for c in "*?"):
        return False
    pattern = leaf.lower()
    return fnmatch.fnmatchcase(".env", pattern) or fnmatch.fnmatchcase(".envrc", pattern)


def collect_candidates(tool_name: str, tool_input: dict) -> list[str]:
    candidates: list[str] = []
    if tool_name in SHELL_TOOLS:
        if tool_input.get("command"):
            command = remove_prose_arguments(str(tool_input["command"]))
            candidates += re.split(r"""[\s'"`;|&<>()=,]+""", command)
    else:
        for prop in ("file_path", "notebook_path", "path", "glob"):
            if tool_input.get(prop):
                candidates.append(str(tool_input[prop]))
        # Glob's pattern is a file pattern; Grep's pattern is content regex, so it is excluded.
        if tool_name == "Glob" and tool_input.get("pattern"):
            candidates.append(str(tool_input["pattern"]))
    return candidates


def main() -> int:
    try:
        payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except ValueError:
        return 0
    if not isinstance(payload, dict):
        return 0
    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        return 0

    for candidate in collect_candidates(str(payload.get("tool_name", "")), tool_input):
        if not candidate.strip():
            continue
        leaf = re.split(r"[\\/]", candidate)[-1]
        if ENV_NAME.search(leaf) or is_dot_glob_for_env(leaf):
            print(
                f"Blocked: '{candidate}' is an env file. Agents must never read, search, or edit .env files. "
                "Ask the user to supply the value instead.",
                file=sys.stderr,
            )
            return 2
    return 0


if __name__ == "__main__":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
