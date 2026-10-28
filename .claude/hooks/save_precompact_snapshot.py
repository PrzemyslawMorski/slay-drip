"""PreCompact hook: save the repo state before compaction so the work can be restored afterwards.

Writes outside the repo to ~/.claude/handoffs/<project>/compaction/.
Stores the transcript path, never the transcript itself. Never blocks compaction: always exits 0.
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def git(cwd: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    return result.stdout.strip()


def main() -> None:
    payload = json.load(sys.stdin)
    cwd = Path(payload["cwd"])
    session_short = "".join(c for c in payload.get("session_id", "") if c.isalnum())[:8]
    custom = payload.get("custom_instructions") or "none"

    out_dir = Path.home() / ".claude" / "handoffs" / cwd.name / "compaction"
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d-%H%M")
    out_file = out_dir / f"{stamp}-{session_short}-precompact.md"

    content = f"""# Pre-compaction snapshot

Written: {datetime.now():%Y-%m-%d %H:%M} - Trigger: {payload.get("trigger")} - Session: {payload.get("session_id")}
Project: {cwd}
Transcript: {payload.get("transcript_path")}
Custom instructions: {custom}

## Repo state
Branch: {git(cwd, "branch", "--show-current")}

### Uncommitted and untracked (git status --short)
{git(cwd, "status", "--short")}

### Recent commits
{git(cwd, "log", "--oneline", "-5")}

### Worktrees
{git(cwd, "worktree", "list")}
"""
    out_file.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # A failed snapshot must not stop compaction.
        pass
    sys.exit(0)
