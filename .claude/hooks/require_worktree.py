"""PreToolUse hook: blocks file edits and branch-changing git commands in the main checkout.

Agents must work in a linked worktree (see CLAUDE.md, "Parallel work with git worktrees").
The repo is resolved from the directory each call acts on, not from CLAUDE_PROJECT_DIR. That lets a session
that has entered a worktree commit there, while the main checkout (its .git is a directory) stays blocked.
Exit 2 = block the tool call; the stderr message is shown to Claude.
"""

import json
import os
import re
import subprocess
import sys

# Git commands that change the working tree, index or branch state.
MUTATING_GIT = re.compile(
    r"(?i)\bgit\s+(?:(?:-C|-c)\s+\S+\s+)*(add|commit|checkout|switch|restore|merge|rebase|reset"
    r"|cherry-pick|revert|stash|am|apply|clean|mv|rm)(\s|$)"
)
EDIT_TOOLS = ("Edit", "Write", "MultiEdit", "NotebookEdit")
SHELL_TOOLS = ("Bash", "PowerShell")
HINT = (
    "Create a worktree and work there: git worktree add ../slay-drip-worktrees/<branch-slug> "
    "-b <type>/<branch-slug> main (or use EnterWorktree)."
)


def convert_to_windows_path(path: str) -> str:
    # Git Bash writes paths as /c/repos/...; Windows path APIs need C:/repos/... to resolve them.
    match = re.match(r"^/([a-zA-Z])(/.*)?$", path)
    if match:
        return match.group(1).upper() + ":" + (match.group(2) or "")
    return path


def resolve_existing_dir(path: str | None) -> str | None:
    # Nearest existing directory at or above a path, so a new file in a new folder still resolves to its repo.
    directory = path
    while directory and not os.path.isdir(directory):
        parent = os.path.dirname(directory)
        if parent == directory:
            return None
        directory = parent
    return os.path.abspath(directory) if directory else None


def main() -> int:
    try:
        payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except ValueError:
        return 0
    if not isinstance(payload, dict):
        return 0
    tool_name = str(payload.get("tool_name", ""))
    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        return 0

    # Relative paths and bare git commands resolve from the session's working directory.
    session_dir = payload.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    session_dir = os.path.abspath(convert_to_windows_path(str(session_dir)))

    is_edit_tool = tool_name in EDIT_TOOLS
    if not (is_edit_tool or tool_name in SHELL_TOOLS):
        return 0

    # The directory this call acts on. Cheap checks first, so git is only queried when a call could change a repo.
    if is_edit_tool:
        file_path = str(tool_input.get("file_path") or "")
        if not file_path.strip():
            file_path = str(tool_input.get("notebook_path") or "")
        if not file_path.strip():
            return 0
        full_path = os.path.abspath(os.path.join(session_dir, convert_to_windows_path(file_path)))
        action_dir = resolve_existing_dir(os.path.dirname(full_path))
        blocked_label = f"'{file_path}'"
    else:
        command = str(tool_input.get("command") or "")
        if not MUTATING_GIT.search(command):
            return 0
        action_dir = session_dir
        # A leading "cd <dir> &&" or a "git -C <dir>" moves the directory the git command runs in.
        cd = re.match(r'(?i)^\s*cd\s+"?([^"&;|]+?)"?\s*(&&|;)', command)
        if cd:
            action_dir = resolve_existing_dir(os.path.join(action_dir, convert_to_windows_path(cd.group(1).strip())))
        git_c = re.search(r'(?i)\bgit\s+-C\s+"?([^"\s;|&]+)"?', command)
        if action_dir and git_c:
            action_dir = resolve_existing_dir(os.path.join(action_dir, convert_to_windows_path(git_c.group(1))))
        blocked_label = f"'{command}'"
    if not action_dir:
        return 0

    # Main checkout: git-dir and git-common-dir are the same. A linked worktree has its own git-dir.
    result = subprocess.run(
        ["git", "-C", action_dir, "rev-parse", "--path-format=absolute", "--git-dir", "--git-common-dir"],
        capture_output=True,
        text=True,
    )
    lines = result.stdout.strip().splitlines()
    if result.returncode != 0 or len(lines) < 2:
        return 0
    git_dir = os.path.normcase(os.path.abspath(lines[0]))
    common_dir = os.path.normcase(os.path.abspath(lines[1]))
    if git_dir != common_dir:
        return 0

    if is_edit_tool:
        print(
            f"Blocked: {blocked_label} is in the main checkout, which must stay at main for reading and review. {HINT}",
            file=sys.stderr,
        )
    else:
        print(
            f"Blocked: {blocked_label} changes the main checkout ({action_dir}). Changes belong in a worktree. {HINT}",
            file=sys.stderr,
        )
    return 2


if __name__ == "__main__":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
