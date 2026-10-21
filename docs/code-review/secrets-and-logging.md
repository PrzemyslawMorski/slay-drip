# Secrets and logging

Source: [security.md §9, §10](../security.md#9-secrets-and-configuration) and [CLAUDE.md](../../CLAUDE.md) "Hard rules".

## Blocking when the diff

- A secret, API key, IAM key, database URL or signing key is in the repo, a client bundle, a build variable passed to the client, a log, a doc or a test fixture.
- Any `.env`, `.env.*`, `*.env` or `.envrc` file is added, edited or referenced in a way that reads its values. Ask for values; do not work around the block.
- A log line, error message or metric includes an email, name, body data, measurements, free text, photos, tokens, authorisation headers, prompts or model output.
- A whole request or response body is logged instead of an allow-listed set of fields.
- An API error returns a database error, stack trace or SQL text to the client, or lacks a correlation ID.

## Needs a decision (flag, do not decide)

- Log retention period, to be stated on the privacy page.
- Security contact and `SECURITY.md` (open item).

## Check

- Secrets come from the Scaleway container environment or GitHub environment secrets, scoped to one environment.
- CI tool versions are pinned, and no step pulls `latest`.
