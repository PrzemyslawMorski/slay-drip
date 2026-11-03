#!/usr/bin/env python3
"""Record Playwright scenarios as browser videos and package them as proof.

Usage (from the repo root or any worktree root):
    python .claude/skills/recorded-browser-run-as-proof/scripts/record_proof.py --name s1-02-start-outfit --grep "An adult with wardrobe items can start a new outfit"

The script runs the matching scenarios in frontend/ with video recording on, converts each
recording to H.264 MP4 with ffmpeg, takes a still just before each step ends, and writes
frontend/proof-runs/<name>/<scenario>/ with:

    run.mp4              the recording
    steps/NN.png         one still per step, taken just before the step ends
    contact-sheet.png    the stills in one image
    manifest.json        machine-readable result, steps and timings
    PROOF.md             the proof for a reviewer, with the status at the top

Exit status: 0 when every matched scenario passed, 1 when any failed or the run could not
produce a recording, 2 when the tools are missing. A failed run still writes its files, so
the recording shows what happened. Such a run is not proof of a pass.

Timings are approximate. The video starts at the first step, and step durations are summed
from there, so each time is within about 0.3 s. The recording itself is the record.
Stills are taken 0.2 s after each step ends, so they show what the step's action did.
"""

import argparse
import datetime
import json
import math
import os
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
FRONTEND = REPO_ROOT / "frontend"
OUT_ROOT = FRONTEND / "proof-runs"
PROOF_PROJECT = "mobile-chromium"
# Take each still this long after its step ends, so the frame shows what the step's action did.
STILL_DELAY_S = 0.2
ANSI = re.compile(r"\x1b\[[0-9;]*m")
NAME_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]*$")

INSTALL_HINTS = {
    "ffmpeg": "Install FFmpeg. Windows: winget install --id Gyan.FFmpeg, then open a new terminal. "
    "macOS: brew install ffmpeg. Linux: sudo apt install ffmpeg.",
    "ffprobe": "ffprobe comes with FFmpeg. Install FFmpeg as above.",
    "npx": "Install Node.js 22 or later from nodejs.org, then run npm ci in frontend/.",
}


def die(message, code=2):
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(code)


def require_tool(name):
    path = shutil.which(name)
    if not path:
        die(f"{name} is not on PATH. {INSTALL_HINTS[name]}")
    return path


def run(cmd, env=None, cwd=None, capture=True):
    result = subprocess.run(
        cmd,
        cwd=cwd,
        env=env,
        capture_output=capture,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return result


def ffmpeg_or_die(ffmpeg, args):
    result = run([ffmpeg, "-v", "error", "-y", *args])
    if result.returncode != 0:
        die(f"ffmpeg failed: {result.stderr.strip()}", code=1)


def probe_duration(ffprobe, path):
    result = run(
        [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ]
    )
    if result.returncode != 0 or not result.stdout.strip():
        die(f"ffprobe could not read {path}: {result.stderr.strip()}", code=1)
    return float(result.stdout.strip())


def collect_tests(suite, found):
    for spec in suite.get("specs", []):
        for test in spec.get("tests", []):
            results = test.get("results", [])
            if results:
                found.append((spec["title"], results[-1]))
    for child in suite.get("suites", []):
        collect_tests(child, found)
    return found


def slugify(text):
    text = re.sub(r"@\S+", "", text)
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:60] or "scenario"


def first_line(message):
    cleaned = ANSI.sub("", message or "").strip()
    return cleaned.splitlines()[0] if cleaned else ""


def git_state():
    head = run(["git", "rev-parse", "--short", "HEAD"], cwd=REPO_ROOT)
    if head.returncode != 0:
        return "unknown"
    status = run(["git", "status", "--porcelain"], cwd=REPO_ROOT)
    dirty = " (uncommitted changes)" if status.stdout.strip() else ""
    return f"{head.stdout.strip()}{dirty}"


def process_test(title, result, out_dir, ffmpeg, ffprobe, command):
    scenario_dir = out_dir / slugify(title)
    if scenario_dir.exists():
        shutil.rmtree(scenario_dir)
    (scenario_dir / "steps").mkdir(parents=True)

    status = result.get("status", "unknown")
    video = next(
        (a for a in result.get("attachments", []) if a.get("name") == "video" and a.get("path")),
        None,
    )
    failure = ""
    if video is None:
        failure = "Playwright recorded no video for this scenario."
        status = "no-recording"
    else:
        mp4 = scenario_dir / "run.mp4"
        ffmpeg_or_die(
            ffmpeg,
            [
                "-i",
                video["path"],
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "23",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                "-an",
                str(mp4),
            ],
        )
        duration = probe_duration(ffprobe, mp4)

    steps = []
    cursor = 0.0
    for index, step in enumerate(result.get("steps", []), start=1):
        step_ms = step.get("duration", 0)
        start = cursor
        cursor += step_ms / 1000
        if video is not None:
            still_at = max(0.0, min(cursor + STILL_DELAY_S, duration - 0.05))
            still = scenario_dir / "steps" / f"{index:02d}.png"
            ffmpeg_or_die(
                ffmpeg,
                ["-i", str(mp4), "-ss", f"{still_at:.2f}", "-frames:v", "1", str(still)],
            )
        error = first_line(step.get("error", {}).get("message", ""))
        steps.append(
            {
                "index": index,
                "title": step.get("title", ""),
                "result": "failed" if error else "passed",
                "start_s": round(start, 2),
                "end_s": round(cursor, 2),
                "duration_ms": step_ms,
                "still": f"steps/{index:02d}.png",
                "error": error,
            }
        )

    if video is not None and steps:
        cols = min(len(steps), 6)
        rows = math.ceil(len(steps) / cols)
        ffmpeg_or_die(
            ffmpeg,
            [
                "-framerate",
                "1",
                "-i",
                str(scenario_dir / "steps" / "%02d.png"),
                "-vf",
                f"scale=240:-2,tile={cols}x{rows}",
                "-frames:v",
                "1",
                str(scenario_dir / "contact-sheet.png"),
            ],
        )

    if status != "passed" and not failure:
        failing = next((s["error"] for s in steps if s["error"]), "")
        failure = failing or f"Scenario status: {status}."

    manifest = {
        "scenario": title,
        "status": status,
        "failure": failure,
        "project": PROOF_PROJECT,
        "duration_ms": result.get("duration", 0),
        "recorded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "commit": git_state(),
        "command": command,
        "video": "run.mp4" if video else None,
        "video_duration_s": round(duration, 2) if video else None,
        "steps": steps,
    }
    (scenario_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (scenario_dir / "PROOF.md").write_text(render_markdown(manifest), encoding="utf-8")
    return manifest, scenario_dir


def render_markdown(m):
    verdict = (
        "PASSED"
        if m["status"] == "passed"
        else f"{m['status'].upper()}: this recording shows what happened. It is not proof of a pass."
    )
    lines = [
        f"# Proof: {m['scenario']}",
        "",
        f"**Result:** {verdict}",
        "",
        f"Recorded {m['recorded_at']} · Commit `{m['commit']}` · Project `{m['project']}` (Pixel 7 emulation)",
        "",
        f"Command: `{m['command']}`",
        "",
    ]
    if m["video"]:
        lines += [f"Recording: [run.mp4]({m['video']}) ({m['video_duration_s']} s)", ""]
    if m["steps"]:
        lines += ["![Contact sheet](contact-sheet.png)", ""]
        lines += ["| # | Step | Result | At (s) | Still |", "| --- | --- | --- | --- | --- |"]
        for s in m["steps"]:
            title = s["title"].replace("|", "\\|")
            lines.append(
                f"| {s['index']} | {title} | {s['result']} | {s['start_s']}–{s['end_s']} | [{s['index']:02d}]({s['still']}) |"
            )
        lines.append("")
    if m["failure"]:
        lines += ["**Failure:**", "", f"> {m['failure']}", ""]
    lines += [
        "Timings are approximate (about 0.3 s). The video starts at the first step, and step",
        "durations are summed from there. Each still is taken 0.2 s after its step ends.",
        "",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--name", required=True, help="Proof folder name, lowercase, for example s1-02-start-outfit.")
    parser.add_argument(
        "--grep",
        required=True,
        help="Playwright --grep pattern. Matches scenario titles, which include tags such as @S1-02.",
    )
    parser.add_argument(
        "--with-deps",
        action="store_true",
        help="Also run the stack-lifecycle project. Needed for Keycloak and stack scenarios. It starts Docker services.",
    )
    args = parser.parse_args()

    if not NAME_PATTERN.match(args.name):
        die("--name must use lowercase letters, digits and hyphens, for example s1-02-start-outfit.")

    ffmpeg = require_tool("ffmpeg")
    ffprobe = require_tool("ffprobe")
    npx = require_tool("npx")
    if not (FRONTEND / "node_modules" / "@playwright" / "test").is_dir():
        die("frontend/node_modules is missing. Run npm ci in frontend/ first.")

    out_dir = OUT_ROOT / args.name
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)
    report = out_dir / "playwright-report.json"

    bdd = run([npx, "bddgen"], cwd=FRONTEND, capture=False)
    if bdd.returncode != 0:
        die("bddgen failed. Fix the feature or step files, then run again.", code=1)

    playwright_cmd = [npx, "playwright", "test", "--project", PROOF_PROJECT, "--grep", args.grep, "--reporter=list,json"]
    if not args.with_deps:
        playwright_cmd.insert(playwright_cmd.index("--grep"), "--no-deps")
    env = {**os.environ, "PROOF_RECORDING": "1", "PLAYWRIGHT_JSON_OUTPUT_NAME": str(report)}
    playwright = run(playwright_cmd, env=env, cwd=FRONTEND, capture=False)

    if not report.exists():
        die(f"Playwright wrote no report (exit {playwright.returncode}). Check the output above.", code=1)
    data = json.loads(report.read_text(encoding="utf-8"))
    found = []
    for suite in data.get("suites", []):
        collect_tests(suite, found)
    if not found:
        die(f"No scenario matched --grep {args.grep!r}.", code=1)

    command = shlex.join(playwright_cmd)
    summary = []
    for title, result in found:
        manifest, scenario_dir = process_test(title, result, out_dir, ffmpeg, ffprobe, command)
        summary.append((manifest["status"], scenario_dir))

    for status, scenario_dir in summary:
        print(f"{status.upper():>12}  {scenario_dir / 'PROOF.md'}")
    all_passed = all(status == "passed" for status, _ in summary) and playwright.returncode == 0
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
