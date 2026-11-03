---
name: recorded-browser-run-as-proof
description: Verify a behaviour in Slay Drip by recording a real browser run of its Gherkin acceptance scenario, then package the video, stills and a PASSED or FAILED verdict as proof. Use this whenever the user asks to prove, verify or demonstrate that a feature or scenario works in the browser, wants a recording, screen capture, video or screenshots as evidence, says "recorded proof", "record the run", "show it working", "prove this scenario", "evidence for the PR", or wants a UI ticket checked by a browser recording before it is marked done. Covers the Playwright run, ffmpeg conversion and the proof bundle. Do not use it to write new scenarios or to review code.
---

# Recorded browser run as proof

A proof is a recording of a Playwright run of an acceptance scenario in `frontend/tests/features/`, packaged with its per-step stills and a verdict. The scenario is the behaviour definition (ADR-0003). The recording only shows what that scenario already checks, so the proof and the test can never drift apart.

## What counts as proof

- **PASSED** is proof. The scenario ran in Chromium with a Pixel 7 profile against the local app, and every step passed.
- **FAILED** is evidence of what happened, not proof of a pass. Say so in the report, and do not describe the behaviour as working.
- A scenario that does not exist cannot be proven. Write it first, through the ticket and spec flow in CLAUDE.md, or ask the user which scenario to use. Do not invent a scenario just to record it.
- Never weaken an assertion or skip a step to make a recording pass. If the behaviour is broken, the proof says so.

## Prerequisites

Check these before running. Install only what is missing, and tell the user what you installed.

| Need | Check | Install |
| --- | --- | --- |
| Python 3.10+ | `python --version` | python.org (not the Store stub) |
| ffmpeg and ffprobe on PATH | `ffmpeg -version` | Windows: `winget install --id Gyan.FFmpeg`, then open a new terminal. macOS: `brew install ffmpeg`. Linux: `sudo apt install ffmpeg` |
| Node 22+ | `node --version` | nodejs.org |
| Frontend dependencies, in this worktree | `frontend/node_modules/@playwright/test` exists | `npm ci` in `frontend/` |
| Chromium for Playwright | a `chromium-*` folder in the ms-playwright cache (`%LOCALAPPDATA%\ms-playwright` on Windows, `~/Library/Caches/ms-playwright` on macOS, `~/.cache/ms-playwright` on Linux) | `npx playwright install chromium` in `frontend/` |
| Local stack, for stack scenarios only | `docker ps` shows the stack | `docker compose up -d`, see `docs/local-development.md` |

Playwright records the WebM video with its own bundled ffmpeg. The system ffmpeg makes the MP4, the stills and the contact sheet. Both are needed.

Dependencies and the local stack are per worktree (CLAUDE.md). Run the proof in the worktree that holds the code being proven.

## Procedure

1. **Find the scenario.** Search `frontend/tests/features/` for the scenario title or its tag (for example `@S1-02`). Use the exact title when one scenario is enough, or a tag for every scenario in a ticket.

2. **Record it.** From the worktree root:

   ```sh
   python .claude/skills/recorded-browser-run-as-proof/scripts/record_proof.py --name s1-02-start-outfit --grep "An adult with wardrobe items can start a new outfit"
   ```

   - `--name` is the proof folder, lowercase with hyphens. Use the ticket or requirement ID when there is one.
   - `--grep` is a Playwright pattern matched against the scenario title, which includes its tags.
   - Add `--with-deps` for Keycloak or stack scenarios. Those scenarios depend on the `stack-lifecycle` project, which starts Docker services. Without the flag, the script runs with `--no-deps`, so the stack is not touched.

3. **Read the result.** The script prints `PASSED` or `FAILED` and the path to each `PROOF.md`. Open the `PROOF.md`, check the step table, and look at the contact sheet. For a failure, look at the failing step's still and the error. Open `run.mp4` when timing matters.

4. **Report.** Give the user the verdict, the step count, the proof path, and the commit recorded in the proof. If the proof says `(uncommitted changes)`, say the recording covers changes that are not committed yet. Quote FAILED runs as failures, with the first error line.

5. **Stop anything you started.** Playwright stops the dev server it started. If it reused one that was already running, leave that one alone and say so. Stop any Docker stack you started for the run, with `docker compose stop`, not `down -v`.

## Where things go

- Proofs are written to `frontend/proof-runs/<name>/<scenario>/`. The folder is gitignored, because recordings are large and are not reviewed in diffs.
- Each proof folder holds `PROOF.md`, `run.mp4`, `contact-sheet.png`, `steps/NN.png`, `manifest.json`, and `playwright-report.json` alongside them.
- Re-running with the same `--name` replaces that folder. Other proof names are not touched.
- Playwright's own `frontend/test-results/` is wiped at the start of every run, so proofs must not live there.

To share a proof, attach `PROOF.md` and `run.mp4` to the PR by hand, or link the CI artifact once CI publishes them (ADR-0003 puts CI wiring with the first deploy ticket). Do not commit recordings to the repo.

## Data rules

- Synthetic data only. The acceptance scenarios generate their photos (`tests/support/photos.ts`). A recording shows everything on screen, so check that a scenario never uses a real person, a real account, real photos or a real email before recording it (`docs/security.md`).
- Do not record with a real identity provider account. The local Keycloak realm has only synthetic users (`*@example.test`), so Keycloak scenarios must use those.
- Never read or print `.env` files to set up a run. Ask the user for any value you need.

## Script facts

- `scripts/record_proof.py` uses the Python standard library only, as CLAUDE.md requires. Do not add a `.sh` or `.ps1` version.
- It sets `PROOF_RECORDING=1`, which `frontend/playwright.config.ts` reads to keep a video of every scenario, not only failing ones.
- Exit status: `0` when every matched scenario passed, `1` when any failed or no recording was produced, `2` when a tool is missing, with install hints.
- Timings in `PROOF.md` are approximate, within about 0.3 s. The video starts at the first step, and step durations are summed from there. Each still is taken 0.2 s after its step ends, so it shows what the step's action did.
- Only top-level Gherkin steps appear in the step table. Nested Playwright steps do not.
- A scenario that matches more than one test gets one folder per scenario, named from its title.
