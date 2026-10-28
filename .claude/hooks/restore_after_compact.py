"""SessionStart(compact) hook: put the saved compaction state back into context.

Plain-text stdout from SessionStart is added to Claude's context.
Restores the newest pre- and post-compaction files for this session, plus the newest /handoff file
for the project. Never blocks the session: always exits 0.
"""

import json
import sys
from pathlib import Path

MAX_LINES = 200


def newest(folder: Path, pattern: str) -> Path | None:
    matches = sorted(folder.glob(pattern), key=lambda p: p.name, reverse=True)
    return matches[0] if matches else None


def main() -> None:
    payload = json.load(sys.stdin)
    cwd = Path(payload["cwd"])
    session_short = "".join(c for c in payload.get("session_id", "") if c.isalnum())[:8]

    root = Path.home() / ".claude" / "handoffs" / cwd.name
    compaction = root / "compaction"

    lines = ["Context was compacted. The state saved before and after compaction is restored below."]

    for kind in ("precompact", "postcompact"):
        found = newest(compaction, f"*-{session_short}-{kind}.md") if compaction.is_dir() else None
        if found:
            body = found.read_text(encoding="utf-8").splitlines()[:MAX_LINES]
            lines += ["", f"=== {kind} ({found}) ===", *body]

    handoff = newest(root, "*.md") if root.is_dir() else None
    if handoff:
        lines += ["", f"Latest /handoff file for this project: {handoff}"]

    lines += [
        "",
        "If the summary above leaves the goal, status or next step unclear, run the handoff skill to write a full handoff before continuing.",
    ]
    print("\n".join(lines))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # A failed restore must not block the session.
        pass
    sys.exit(0)
