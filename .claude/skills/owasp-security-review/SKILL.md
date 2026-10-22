---
name: owasp-security-review
description: Run a security review of Slay Drip code, config, CI or docs against the OWASP Top 10 (2025 edition), with findings tied to file and line and to the rules in docs/security.md. Use this whenever someone asks for a security review, security audit, vulnerability check, threat review or "is this safe", names OWASP or the Top 10, asks whether a change or PR is secure, or wants a privacy and security check before user data is collected, even if they never say "OWASP". Covers the whole repo or a branch or PR diff. Do not use it for general code review of style or logic (use code-review), for writing the security guide itself, or for a live penetration test of a deployed system.
---

# OWASP Top 10 security review

Review this repo against OWASP Top 10:2025 and the project's own rules in `docs/security.md`. The OWASP list says what kinds of failure to look for. The security guide says what this project requires. Report against both, and cite the section number for each project rule you check.

Read-only. Do not edit code, config or docs, do not commit, and do not run a fix. The report is the output.

## Step 1: Set the scope

Pick one scope, and say which one you used in the report.

- **Whole repo** (default, or when asked for "security review" with no range): review all tracked files that are not generated or vendored (`frontend/dist/`, `node_modules/`, `.features-gen/`, `test-results/` are ignored).
- **Branch or PR**: review `git diff main...HEAD` (or the range the user gives), and read the surrounding files a changed line depends on. A diff review still checks the controls that changed code relies on.

Check `git status` first and note any uncommitted changes you can see.

## Step 2: Read the rules before the code

Read these, in this order:

1. `docs/security.md`. It is the project's control list. Use its section numbers.
2. `CLAUDE.md` "Hard rules" and "Open decisions". Anything in the open list must be flagged, never decided.
3. `docs/adr/` for the decisions the code relies on (ADR-0001 and ADR-0004 cover the current slice).
4. `references/owasp-top-10-2025.md` in this skill. It maps each OWASP category to what to check here.

Do not open `.env`, `.env.*`, `*.env` or `.envrc`. The repo blocks them, and you must not work around the block. If a secret is needed to judge a control, say the value is missing and ask the owner.

## Step 3: Gather evidence for each category

Work through the ten categories in order. For each one:

- Search the scope with Grep and Glob for the patterns listed in the reference file. Read the hits in context. A grep hit is a lead, not a finding.
- Decide one status: **Pass** (a control exists and you checked it), **Finding** (a required control is missing or wrong), **Not applicable yet** (the code that would need the control does not exist; name the trigger, for example "first user-scoped route"), or **Cannot verify** (you need a value, a deployed config or a runtime test you do not have).
- Keep the file and line for every claim.

Use a subagent only if the scope is large enough that reading it all would fill the context. Give it the reference file path and the scope, and ask for file:line evidence only. Review its output yourself before reporting.

## Step 4: Verify each finding before you report it

A finding goes in the report only if all of these hold:

- You read the code path, not just the grep line.
- The control is actually missing or wrong here. Check for a control in a different layer (for example, the edge or CI) before you call it missing in code.
- You can state the concrete failure: what input or state leads to what harm.

Drop anything you could not confirm. Put it under "Ruled out" if it is worth saying you checked it. Do not pad the report with speculative items.

Run tools where they give evidence. For example, `npm audit --audit-level=high` in `frontend/` and `go vet ./...` in `backend/` are read-only checks and are allowed. Do not install new dependencies to do it. If a tool is not installed, say so and mark the affected check Cannot verify.

## Step 5: Write the report

Use this structure exactly. Keep it readable in a terminal: short sentences, no padding.

```
# OWASP Top 10:2025 security review — <scope>

Scope: <whole repo | diff main...HEAD | range>. Reviewed <n> files. Edition: OWASP Top 10:2025.
Project rules: docs/security.md (sections cited as "SG <n>").

## Summary
<two or three sentences: the most important risk, how many findings by severity, and whether anything blocks the next step>

## Category status
| ID | Category | Status | Notes |
| A01 | Broken Access Control | Not applicable yet | No user-scoped API; trigger: first user route |
...all ten rows...

## Findings
Ordered by severity, then by category.

### 1. <short title> — <Severity>
- **Category:** A0x <name>; SG <section>
- **Where:** `path/to/file.go:42`
- **Evidence:** <what the code does, quoted briefly>
- **Failure scenario:** <input or state → harm>
- **Fix:** <the smallest change that meets the rule>

## Open decisions touched
<any finding or change that depends on an open decision in CLAUDE.md or docs/security.md, and what needs deciding, by whom>

## Ruled out
<checks that looked risky and were fine, with the reason, one line each>

## Could not verify
<items needing a runtime test, a deployed config, a secret value, or a missing tool>
```

Rules for the report:

- Severity uses the scale in the reference file (Critical, High, Medium, Low, Info).
- Credit good controls in "Ruled out" or Info, so the owner knows what to keep.
- Never say a category is clean because the code is absent. Use "Not applicable yet" and name the trigger.
- Do not restate the OWASP descriptions or the security guide. Cite the section.
- If there are no findings, say so, and still fill the category table and the "Could not verify" list.

## Step 6: Hand off

End with one line offering the next step: fix the findings (as separate tickets or a branch per finding, using the worktree rule in CLAUDE.md), or a spec for any finding that needs a design decision. Do not start the fixes unless asked.

## Notes on scope and limits

- This is a static review of the repo. It does not test the running app, scan a deployed host, or test authentication against live endpoints. Say so in the report when it matters.
- The OWASP category titles come from the 2025 list. If the live site shows different titles, follow the site and tell the user.
- Personal, body and special-category data handling is in scope for every category. A finding that exposes such data is at least High, and Critical if it is reachable now.
