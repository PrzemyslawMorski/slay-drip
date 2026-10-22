---
name: handoff
description: Write a handoff file that captures the current state of the work, open threads and next steps, so a fresh session or a teammate can pick it up without the chat history. Use this whenever the user says "handoff", "handover", "hand off", "hand this over", "write up where we are", "dump the state", "save my context", "I'm running out of context", "I'm switching machines/sessions", "pick this up tomorrow", "park this", or invokes /handoff or /handover, even if they don't say "file" or "document". Also use it proactively when a long session is about to lose context and the user has unfinished work.
---

# Handoff

A handoff file is a snapshot a stranger could act on. Its reader has none of this conversation: no memory of what was tried, why a choice was made, or which of the open files matter. So the file has to carry the facts, the reasons and the exact next step.

## Where it goes

Write to `C:\Users\prmo\.claude\handoffs\<project-folder-name>\<YYYY-MM-DD-HHMM>-<short-slug>.md`, using today's date and time. The project folder name is the basename of the working directory. Keep handoffs out of the repo so they never get committed by accident. If the user names another location, use that instead.

Create the directory if it is missing. Never overwrite an existing handoff; a new run gets a new file, and a later one can point back to an earlier one.

## Gather the state first

Collect facts before writing. Run these in parallel where they are independent:

- `git status --short` and `git branch --show-current`: uncommitted and untracked work.
- `git log --oneline -10`: recent commits on this branch.
- `git diff --stat` and `git diff --cached --stat`: how much is in flight.
- `git worktree list`: other checkouts that might hold related work.
- Any failing test, lint or build output from this session that is still unresolved.

Then review the conversation itself for what git cannot show: the goal, what was decided and why, what was tried and abandoned, questions still waiting on the user, and anything promised but not done.

Do not read `.env` files or print their values, even to be helpful. If a handoff needs a config key, name the key and say where it is expected, not what it is set to.

## What to write

Use this structure. Drop a section only when it is truly empty, and say so rather than padding it.

```markdown
# Handoff: <one-line goal>

Written: <YYYY-MM-DD HH:MM> · Project: <path> · Branch: <branch> · HEAD: <short sha>

## Goal
What the work is meant to achieve, in two or three sentences. Link to the requirement, spec or ticket if one exists (for example docs/requirements.md item or a docs/specs/ file).

## Status
- Done and verified: ...
- Done but not verified: ... (say what verification is missing)
- In progress: ... (say exactly where it stopped)
- Not started: ...

## Repo state
- Uncommitted changes: list the files and what each change does, one line each.
- Untracked files: list them and say whether they should be kept.
- Other worktrees or branches that matter.
- Dev servers or local services left running. Ideally none.

## Decisions
Each decision as: what was chosen, the alternative rejected, and the reason. Include the constraint that forced it. These are the things the next person would otherwise re-litigate.

## Ruled out
What was tried and did not work, with the symptom. This stops the next session repeating the same dead end.

## Open threads
Questions waiting on the user or on someone else, each with who it is waiting on. Mark unanswered questions clearly so they are not mistaken for decisions.

## Next steps
A numbered list in the order to do them. The first item must be a concrete action a person could start within a minute, such as "run `go test ./internal/outfit/...` to see the failing case in TestRanking". Mark which steps need the user's approval before they happen.

## How to verify
The commands that show the work is in the state described above, and what a passing result looks like.

## Read first
The few files a newcomer must open before touching anything, with one line on why each matters. Keep this to five or fewer.
```

## Writing rules

- Write for a reader who was not here. Replace "the thing we discussed" with the thing itself.
- State facts with absolute dates and exact file paths, not "yesterday" or "the auth file".
- Separate what was verified from what was assumed. Never mark something done unless it was checked in this session.
- Keep it scannable. Aim for under 150 lines. A long handoff gets skimmed, and the next steps get lost.
- No secrets, tokens, personal data or real user data in the file, even when it came up in the conversation.

## After writing

Tell the user the full path to the file, in one piece, so they can open it. Then give a short summary of three points at most: the goal, the first next step, and anything waiting on them. If something was left out on purpose, say what and why.
