"""PreToolUse hook: blocks recursive deletes such as rm -rf, in Bash and in PowerShell.

Covers rm with a recursive flag in any order or spelling (-rf, -fr, -r -f, --recursive, /bin/rm -Rf),
PowerShell Remove-Item -Recurse (and its rm/ri/rmdir/rd/del aliases), and cmd-style rd/rmdir/del /s.
Single-file deletes are allowed. Exit 2 = block the tool call; the stderr message is shown to Claude.
"""

import json
import re
import sys

PATTERNS = [
    re.compile(r"(?<![\w-])(?:[\w./\\-]*[/\\])?rm\s+(?:-\S+\s+)*(?:-[a-zA-Z]*[rR][a-zA-Z]*\b|--recursive\b)"),
    re.compile(r"(?i)(?<![\w-])(?:remove-item|rm|ri|rmdir|rd|del|erase)\s+(?:[^;|&\n]*\s)?-(?:recurse|r)\b"),
    re.compile(r"(?i)(?<![\w-])(?:rd|rmdir|del|erase)\s+(?:[^;|&\n]*\s)?/s\b"),
]


def main() -> int:
    try:
        payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except ValueError:
        return 0
    if not isinstance(payload, dict):
        return 0
    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict) or not tool_input.get("command"):
        return 0

    command = str(tool_input["command"])
    # Message text is prose, not a delete: a commit message or PR body may name the command.
    # Quoted heredocs (<<'EOF') and unexpanded -m / --title / --body values are removed before the scan.
    # Values with $ or a backtick are kept, because they can run commands.
    command = re.sub(r"(?s)<<\s*'(\w+)'\r?\n.*?\r?\n\s*\1\b", " ", command)
    command = re.sub(r'(?<=\s)(?:-m|--message|--title|--body)(?:\s+|=)"[^"$`]*"', " ", command)

    for pattern in PATTERNS:
        match = pattern.search(command)
        if match:
            print(
                f"Blocked: '{match.group(0).strip()}' is a recursive delete. "
                "Agents must not run rm -rf or other recursive deletes. "
                "Delete the named files one at a time, or ask the user to run it.",
                file=sys.stderr,
            )
            return 2
    return 0


if __name__ == "__main__":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
