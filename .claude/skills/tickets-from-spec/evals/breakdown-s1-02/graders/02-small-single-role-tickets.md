---
type: llm
focus: trace
weight: 1
---

Every new ticket file under docs/specs/ named S1-02.<nn>-*.md has exactly one role:<id> label, a role that is defined in references/roles.md, between 1 and 3 Gherkin scenarios, and between 1 and 5 bullets under Files to change. Each file path in that list falls under a path the role owns. The breakdown contains more than one ticket, and no ticket mixes layers such as UI and backend.
