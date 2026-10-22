---
type: llm
focus: trace
weight: 1
---

The reply names playbooks/bugfix.md, then reproduces the failing test and edits files in the task's worktree without asking the user for permission on those steps. Any question asked is about a fact only the user knows, not about running tests or editing the code.
