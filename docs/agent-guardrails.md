# Agent guardrails

The PreToolUse hooks in `.claude/hooks/` stop agents from doing things this repo forbids. They run on every Bash and PowerShell call and on the file tools. This page says what each hook checks and how to do routine work without tripping it. Read it before your first git, GitHub or shell command in this repo.

## Requirements

The hooks are Python scripts that use only the standard library, so there is nothing to install beyond Python itself.

- **Python 3.13** (tested on 3.13; the code needs 3.10 or later). Git and `gh` must also be on PATH for the worktree and PR checks.
- **`python` must resolve to that interpreter** from the shell that Claude Code uses. The hook commands in `.claude/settings.json` call `python` directly.
- **Windows:** the Microsoft Store `python.exe` stub is not a real interpreter, and a machine that has only the `py` launcher has no `python` command. Install Python from python.org and check with `python --version`.
- **Fail open:** if `python` is missing, the hooks do not run and the guards do not block anything, with no error. Check `python --version` before relying on the guards.

## What each hook blocks

| Hook | Blocks | Matches on |
| --- | --- | --- |
| `require_worktree.py` | Edits, and git commands that change state (`add`, `commit`, `checkout`, `merge`, ...), in the main checkout | The directory the call acts on |
| `block_env_files.py` | Reading, searching or editing env files (`.env`, `.env.*`, `*.env`, `.envrc`) | Path-like words in the command, and dot-globs such as `.en*` |
| `block_recursive_delete.py` | Recursive deletes: `rm -r` in any flag order, `Remove-Item -Recurse`, `rd /s`, `del /s` | Command text |
| `block_pii_egress.py` | Outbound calls (`gh`, `git push`, `curl`, web and MCP tools, subagent prompts) that contain emails, phone numbers, card or bank numbers, IPs, secrets, or personal identifiers from the user's own list | Command text and tool input |

The env-file and recursive-delete guards ignore message text. Quoted heredocs (`<<'EOF'`) and unexpanded `-m`, `--title` and `--body` values are removed before the scan, so a commit message or PR body can name a file or a command. A value with `$` or a backtick is still scanned.

The egress guard scans commit messages and PR bodies, since GitHub receives them.

## Routine git work

- **Work in a worktree.** Create one from `main` (see [CLAUDE.md](../CLAUDE.md#parallel-work-with-git-worktrees)). Address it with a literal path and `git -C`, not a shell variable:

  ```sh
  git -C "C:/repos/_playground/slay-drip-worktrees/<branch-slug>" commit -m "..."
  ```

- **Use Windows-style paths** (`C:/repos/...`) in `git -C` and `cd`. Git Bash paths (`/c/repos/...`) are not resolved by the worktree guard.
- **Push** with `git -C "<worktree>" push -u origin <branch>`.

## Opening a PR

Do not write the PR body to a file under your Windows user folder and pass that path to `gh`. The egress guard matches the user-folder name in the path and blocks the call. Pass the body on stdin instead, from a repo-relative command:

```sh
gh pr create --repo <owner>/<repo> --base main --head <branch> --title "<title>" --body-file - <<'EOF'
## Summary
...
EOF
```

## When a guard blocks you

1. Read the reason on stderr. It names the category, never the matched value (the egress guard shows no matched text by design).
2. Fix the call if it really does what the guard was meant to stop: use a worktree, use a repo-relative path, or move the value out of the command.
3. Do not reword the command to slip past a guard. If a basic, legitimate operation is blocked, stop and tell the user what you were doing and which category fired.
4. A personal-identifier match means a term in the user's own list (`~/.claude/pii-denylist.txt`, outside the repo) appears in the call. The user decides whether to change that list. Do not read it to find the term.

## Known limits

- `grep -r` or a directory-wide `cat` can still print env file contents, because the env guard checks only the paths a call names.
- The recursive-delete guard also blocks a recursive delete written inside a command's text, such as `bash -c "rm -rf ..."`. It does not cover `python -c "shutil.rmtree"`, `find -delete` or `git clean -fdx`.
- The guards are pattern-based. They are a backstop, not a substitute for the rules in [security.md](security.md).
