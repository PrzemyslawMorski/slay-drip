# Playbook: workflow (fallback, "figure it out")

Use when a request matches no row in the routing table. This playbook is for work that is new to the repo, not for a request that merely looks awkward.

1. **Restate the goal** in one sentence and name the artefact it should produce: a doc, a file change, an answer, or a decision.
2. **Ask one question if the goal is unclear.** Ask only what changes the route. Do not ask about details you can decide yourself.
3. **Pick the nearest playbook.** Re-read the routing table and choose the closest row. If one fits after a closer look, say so and switch to it.
4. **If nothing fits, work in small steps.** Read the code or docs the request touches, propose the approach in a few lines, and wait for the user's approval before changing files.
5. **Record the gap.** If the request exposed a missing playbook or routing row, say so in the final message so the routing table can be improved.

Standing gates in `SKILL.md` still apply. Hard-to-reverse or outward-facing actions need the user's confirmation.
