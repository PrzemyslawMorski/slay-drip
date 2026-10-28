"""PostCompact hook: save the compaction summary next to the pre-compaction snapshot.

PostCompact output is not sent to the model, so the summary is written to disk for the
SessionStart(compact) hook to restore. Never blocks anything: always exits 0.
"""

import json
import sys
from datetime import datetime
from pathlib import Path


def main() -> None:
    payload = json.load(sys.stdin)
    cwd = Path(payload["cwd"])
    session_short = "".join(c for c in payload.get("session_id", "") if c.isalnum())[:8]

    out_dir = Path.home() / ".claude" / "handoffs" / cwd.name / "compaction"
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d-%H%M")
    out_file = out_dir / f"{stamp}-{session_short}-postcompact.md"

    content = f"""# Post-compaction summary

Written: {datetime.now():%Y-%m-%d %H:%M} - Trigger: {payload.get("trigger")} - Session: {payload.get("session_id")}

## Compaction summary
{payload.get("compact_summary") or "(no summary provided)"}
"""
    out_file.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # A failed write must not affect the session.
        pass
    sys.exit(0)
