# Docs

Where each kind of written decision or plan lives, and how to start a new one from its template.

| Folder | What goes here | Template | Naming |
| --- | --- | --- | --- |
| [`requirements.md`](requirements.md) | Product scope, functional and quality requirements. Source of truth for *what* to build. | n/a | single file |
| [`adr/`](adr/) | Architecture Decision Records: one significant, hard-to-reverse decision each. | [adr.md](templates/adr.md) | `NNNN-kebab-title.md`, next free number, never renumbered |
| [`discovery/`](discovery/) | Research, spikes and investigations that answer questions before a decision or spec. | [discovery.md](templates/discovery.md) | `YYYY-MM-DD-kebab-topic.md` |
| [`specs/`](specs/) | Per-task specs and the backlog index (`specs/README.md`). | [spec.md](templates/spec.md) | `<TASK-ID>-kebab-title.md`, e.g. `S2-02-ai-auto-tagging.md` |
| [`templates/`](templates/) | The starting points above. Copy, do not edit in place. | n/a | n/a |

## Starting a new doc

1. Copy the template into the right folder, using the naming rule above.
2. Replace every `<placeholder>` and delete the sections that do not apply. Do not leave empty headings in a finished doc.
3. Link it from what it depends on or affects: an ADR from the spec it governs, a spec from the requirement it serves.
4. ADRs: add a line to the status once decided (`Accepted`). To change a decision, write a new ADR and mark the old one `Superseded by`. Do not rewrite history.
5. Discovery: set `Outcome` when it concludes, pointing at the ADR or spec it produced.

## Rules that apply to every doc

- Follow the hard rules in [CLAUDE.md](../CLAUDE.md): EU-only processing, consent, no identification, body-talk guardrails, synthetic test data only.
- Never put secrets, real personal data or `.env` values in a doc.
- Keep docs short enough to read in one sitting. Link rather than repeat.
