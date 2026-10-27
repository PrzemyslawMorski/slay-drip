# Workshop takeaways

Repo activity from 2026-10-08 to 2026-10-27, grouped by day. Commit hashes are in brackets.

## Week 1 (8–14 October)

### 2026-10-13: Repo setup, requirements and guardrails

- Added the requirements and task backlog [c4bddf0] and consolidated agent and contributor guidance into `CLAUDE.md` [07dfd0d]. The v1 goal and quality bar were clarified [113fec6].
- Moved the Terraform configuration from AWS to Scaleway [111a402], applying the platform decision.
- Added a PreToolUse hook that blocks agents from reading `.env` files [6f88696].

**Takeaway:** write requirements and rules down before writing code. Agents follow the files in the repo, not what you meant to say.

## Week 2 (15–22 October)

### 2026-10-15: Docs system, specs and tickets

- Added templates for ADRs, discovery notes, specs and JIRA-style tickets [480df69, 1764ffa]. Backlog specs were converted to the ticket format [ea6e471], and security guidelines were added [fbccbe0]. PR #18 merged.
- Finished F01 line-ending normalisation with `.gitattributes` [263e934, f2d5cb4].
- Tried a Keycloak identity provider setup for Scaleway [814964b], then a cleanup commit returned the repo to a greenfield state [65b3100].

**Takeaway:** templates keep agent output consistent. Experiments are cheap to discard when they are kept in their own branch.

### 2026-10-21: First vertical slice and the code review action

- Switched the ticket template to Gherkin acceptance criteria [b4ac06e]. Added ADR-0001 covering EU-only hosting, the 18+ gate and the GDPR framework [2a972c8].
- Wrote Spec 1 (anonymous upload and age check) and implemented it [f0750d5, 8373aec]. Wrote the manual outfit creation spec and implemented S1-02 [c70d76d, 2c16ea0].
- Added a PostgreSQL connection pool and health check API [920aaf9], plus lint and format scripts [584707b].
- Added a Claude Code PR review workflow [bf85003], a model argument for it [e96455f], and review conventions for AI and human reviewers [ae6c1f0].

**Takeaway:** the first slice ran from spec to working code in one day. The review action became the first automated gate.

### 2026-10-22: Skills, CI hardening and security fixes

- Added the `spec-from-intent` skill [8766f0b], ticket breakdown evaluation and validation scripts [4c8bca1], the OWASP Top 10 review skill [658ddf5] and the handoff skill [cd9edb5]. Handoff notes are now git-ignored [4f7c87d].
- Wrote the master `slay-drip` skill with playbooks and routing evals [b1d66aa, b7ca4e3], then fixed the routing that the dry runs exposed [19235a3, 956c252, fd61fdf]. See the master skill section below.
- Added a backend CI workflow for vet, test, lint, vulnerability scan and integration tests [0e1a5c0]. Pinned GitHub Actions to commit SHAs and enabled Dependabot [94db544]. Dependabot bumps were merged [81dcb99, 473e84b].
- Disabled the code review job with a guard clause [c8e5dff].
- Fixed API server timeouts [8c240f0], made wardrobe read errors visible and blocked changes when the wardrobe cannot be read [3d87922], and added a Content-Security-Policy meta tag for OWASP finding 3 [a2fb6b7].

**Takeaway:** once the skills existed, the pipeline (intent → spec → tickets → code → review) could be repeated. Security findings were turned into fixes on the same day.

## Week 3 (23–29 October)

### 2026-10-27: Agent definitions

- Added a PR reviewer agent in `.claude/agents/pr-reviewer.md` [6d2667b]. It checks changes against the repo rulesets and carries zero-downtime rules: expand-only migrations, backward-compatible API changes, and clients that lag behind the server.

**Takeaway:** an agent definition is a repo file, so its rules are versioned and reviewed like code. Keep the rules an agent enforces inside its definition, so one file says both what to check and how to judge it.

## The pipeline at a glance

| Stage | What exists now | Where it started |
| --- | --- | --- |
| Intent and requirements | `docs/requirements.md`, `CLAUDE.md` | 2026-10-13 |
| Guardrails | `.env` blocking hook, `docs/security.md` | 2026-10-13 and 2026-10-15 |
| Spec and ticket templates | `docs/specs/`, Gherkin ticket template | 2026-10-15 and 2026-10-21 |
| Automated review | Claude Code PR review workflow, review conventions | 2026-10-21 |
| Skills | `spec-from-intent`, ticket breakdown, OWASP review, handoff, master `slay-drip` | 2026-10-21 to 2026-10-22 |
| CI | Backend workflow, pinned actions, Dependabot | 2026-10-22 |
| Agent definitions | `.claude/agents/pr-reviewer.md` | 2026-10-27 |

## The master skill: one entry point that routes to playbooks

The `slay-drip` skill is a router. It classifies a request, picks one playbook, and loads only the skills that playbook names. The routing table, playbooks and evals live in `.claude/skills/slay-drip/`.

**What worked**

- Separate playbook files keep the router short. Each playbook loads only when its row matches.
- Dry-run evals found real faults before anything relied on the skill. Eight cases ran as read-only subagents on 2026-10-22. Five matched their expected routing. Three did not: two went to the wrong playbook, and one fell through to the fallback.
- A fallback row sends unmatched requests to a "figure it out" playbook that asks one question before it acts.
- The autonomy rules are explicit. Reversible work proceeds. Force-pushes, merges to `main`, deploys and data deletion pause for confirmation.

**What the evals exposed**

- A tie-break example told the router to send a bug in personal data to the feature playbook. The bug row now wins for any reported defect.
- Git writes such as force-push and merge to `main` had no row, so they fell through to the fallback. A row now sends them to the pause rule.
- The feature playbook said to stop at the requirement gate, but a dry run still planned a spec and tests first. Steps 2 to 7 now wait for the answer.

**Takeaway:** test the router with vague, mixed and risky requests, not only the skills it loads. Write tie-break rules as rules, not examples, because a worked example gets copied as a rule.

**Still open**

- The dry runs checked planned routes, not recorded tool traces. Run the evals in fresh sessions before relying on them.
- Body-photo and measurement consent and deletion are not implemented. `docs/security.md` says revoking consent deletes the data, the backend has no consent check, and `docs/code-review/consent-and-gdpr.md` says revoking does not delete. That needs its own ticket.
