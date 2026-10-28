# OWASP Top 10:2025 — what to check in Slay Drip

Edition: OWASP Top 10:2025 (top10.owasp.org). Category titles below are from the 2025 list. If the live site shows different titles, trust the site and tell the user.

Each category lists what to look for in this repo, and the `docs/security.md` section that already sets the rule. Do not restate the rule in the report; cite the section and check the code against it.

Today the repo has a frontend-only slice (ADR-0004: photos and outfits on the device, no sign-in, no user API) and a Go API with only `GET /healthz`. Many checks are **not applicable yet**. Say so, and name the trigger that will make them apply (for example "F02 identity provider chosen", "first user-scoped route added"). Do not mark a category clean because nothing is there yet.

---

## A01:2025 Broken Access Control

Look for: routes that touch user data without auth; queries that do not filter by owner; IDs taken from the client for create or read; CORS set to `*` on data routes; directory or bucket listing; path traversal in file handling; SSRF from any URL the server fetches.

In this repo:
- `backend/internal/server/server.go` registers only `GET /healthz`. Any new route must be checked for auth (security guide 5, deny by default).
- Today's personal data is device-only (`frontend/src/storage/localDb.ts`). There is no server-side owner check yet. Mark as not applicable until a user-scoped API exists.
- Consent and deletion are checked in the client only (`withdrawWardrobeConsent`). Security guide 3 requires the server to check consent before any read or write. Flag this when the API starts storing that data.
- Object storage: `infra/dev/s3.json` is a dev identity with full `Admin` actions. Check that nothing wires it to a non-local endpoint, and that production buckets are private (security guide 7, 13).

## A02:2025 Security Misconfiguration

Look for: default or dev credentials reaching a non-dev path; debug modes; missing HTTP timeouts; missing security headers (CSP, `no-store` on personal data); permissive CORS; dev ports bound to all interfaces; unnecessary features enabled.

In this repo:
- `compose.yaml` and `infra/dev/s3.json` hold throwaway local credentials. This is documented and bound to `127.0.0.1`. Flag only if they leak into a deployment path, or if a port binds to `0.0.0.0` on the host.
- `backend/cmd/api/main.go` sets `ReadHeaderTimeout` only. There is no `ReadTimeout`, `WriteTimeout` or `IdleTimeout`. Report as Low.
- `frontend/index.html` has no Content-Security-Policy. Security guide 11 requires a CSP that allows only the app's origin and the approved API host. A `<meta>` CSP can be a stopgap, but the production CSP is set at the edge. Report as Medium until the hosting config exists.
- Responses for personal data need `Cache-Control: no-store` (security guide 6). There are no such responses yet.

## A03:2025 Software Supply Chain Failures

Look for: unpinned or floating dependencies; installs that skip the lockfile; GitHub Actions pinned to mutable tags; CI without vulnerability scanning; new vendors or SDKs without a recorded ADR; third-party scripts or fonts loaded from non-EU hosts; committed binaries or build output.

In this repo:
- `frontend-ci.yml` runs `npm ci` (lockfile-only) and `npm audit --audit-level=high`. Good. Check the lockfile is committed.
- Both workflows use `actions/checkout@v4`, `actions/setup-node@v4` and `anthropics/claude-code-action@v1`, pinned to mutable major tags. Security guide 12 asks for pinned CI tool versions. Report as Medium and recommend pinning to commit SHAs.
- There is no backend CI workflow. `go.mod` declares `govulncheck` and `golangci-lint` as tools, but nothing in `.github/workflows` runs them or `go test ./...`. Report as High, since CLAUDE.md requires `go test ./...` before a PR.
- `claude-code-review.yml` runs on `pull_request` (not `pull_request_target`), skips forks, and has read-only contents. Good; note it as a control.
- `_samples/` holds committed third-party images under OpenRAIL. `_samples/README.md` says the licence needs a check before use beyond development. This is a licensing and provenance issue (requirements open decision on IP) rather than a code vulnerability. Report as Low or Medium, and mention it under the IP open decision.
- New dependencies (see `frontend/package.json`) need the review in security guide 12. Check that any new one has no network access it does not need.

## A04:2025 Cryptographic Failures

Look for: data sent or stored without TLS; weak or homemade crypto; secrets or keys in code; predictable IDs or tokens (`Math.random`, sequential ints for identifiers); plaintext personal data at rest where encryption is required; DB connections without `sslmode`.

In this repo:
- IDs use `crypto.randomUUID()` (`localDb.ts`), which is correct. Security guide 6 also asks for server-generated UUIDs on create.
- `docs/local-development.md` uses `sslmode=disable` for the local database only. Check that production config sets `sslmode=require` (or `verify-full`) and that the URL comes from the container environment (security guide 9, 13).
- Encryption at rest on the device (IndexedDB) is not applied. Security guide 13 covers at-rest encryption for stores, not device storage. Note it as a design question for the DPO rather than a finding.
- No hashing, signing or token code exists yet. Mark not applicable.

## A05:2025 Injection

Look for: SQL built by string concatenation or formatting; shell commands with interpolated input; unsafe HTML rendering (`dangerouslySetInnerHTML`, `innerHTML`, `eval`); LDAP, NoSQL or template injection; prompt injection where user text reaches an AI prompt as instructions.

In this repo:
- No SQL yet. `backend/internal/db/db.go` only opens a pool and pings. Every future query must use placeholders (security guide 6, pgx parameters).
- `frontend/src` has no `dangerouslySetInnerHTML`, `innerHTML` or `eval` in the current code. Outfit names and item labels reach React as text. Re-check on each change.
- `scripts/dev/s3_smoke.py`: check that no argument is interpolated unquoted into a command.
- AI injection (security guide 8, treat user text as data) applies once outfit generation exists. Not applicable yet.

## A06:2025 Insecure Design

Look for: missing threat model for a feature touching personal data; missing business-rule controls (age gate, consent, hard constraints); features that cannot be abused safely; decisions that should be an ADR but are not; open decisions decided in code.

In this repo:
- Strong points to credit: consent is granular with wording version (`localDb.ts`); the age gate stores no date of birth (ADR-0001, security guide 2); photo handling strips metadata by re-encoding (`preparePhoto.ts`).
- There is no threat model document under `docs/`. Report as Medium for the first feature that touches the API. Do not require it for the frontend-only slice.
- Check for decisions made in code that belong to the open list in `docs/security.md` or `CLAUDE.md`: identity provider, DPO review of special-category fields, erasure window, EU model choice. Any such decision in code is a finding (High).
- Check that the 18+ gate is backed by the server once sign-up exists. The client-only gate in `AgeGate.tsx` is for UX only (security guide 2).

## A07:2025 Authentication Failures

Look for: login or sign-up without rate limiting; weak session or token handling; tokens in URLs or logs; tokens trusted without signature, issuer, audience and expiry checks; missing sign-out cleanup.

In this repo:
- There is no authentication yet. Identity provider (F02) is an open decision. Mark not applicable and name the trigger.
- Once it lands, check security guide 5 (verify signature, issuer, audience and expiry; take identity only from the verified token) and security guide 6 (rate limit auth endpoints).
- `AgeGate.tsx` and `ConsentPanel.tsx` have no sign-out path. Security guide 11 says local data is cleared on sign-out. Not applicable until accounts exist.

## A08:2025 Software or Data Integrity Failures

Look for: unverified deserialisation of stored or received data; CI or build steps that pull unverified artefacts; auto-update without signature checks; trusting client-side values for server decisions; unsigned container images.

In this repo:
- IndexedDB records are read back with type assertions and no validation (`localDb.ts`, `readWardrobeItems`). Local data is trusted, but the client should not treat stored values as authorization. Note as Low.
- Container images come from Scaleway registry with a pinned base (security guide 12). There are no Dockerfiles yet. Not applicable.
- The CI workflows do not sign or attest build output. Report as Low until a deployment pipeline exists.
- Check that the server never accepts a client-supplied `itemIds`, `outfitId` or consent state as authoritative without a server-side owner check (A01 overlap).

## A09:2025 Security Logging and Alerting Failures

Look for: logs missing security events (auth failures, consent changes, deletions); logs containing personal data, body data, tokens, prompts or free text (security guide 10); no alerting; no log retention set.

In this repo:
- `main.go` uses `slog` with error and listen messages only. No personal data in them. Good.
- No request logging, no auth events, no alerting. Security guide 10 asks for alerts on authentication failures, deletion volume and repeated 5xx. Not applicable until those routes exist; flag as a gap in the plan.
- Search `frontend/src` for `console.` calls that could log photo data, item names or outfit content. Any such call is a finding under security guide 10.
- Log retention period is an open item; note it.

## A10:2025 Mishandling of Exceptional Conditions

Look for: errors that leak stack traces, SQL text or internal paths to clients; fail-open behaviour (allowing an action when a check errors); unhandled promise rejections that leave partial state; missing timeouts; resource exhaustion from unbounded input.

In this repo:
- `main.go` exits on startup or serve errors and logs them. That is correct for a server.
- `preparePhoto.ts` maps decode failures to typed rejections and checks size and type before decoding. This is a good fail-closed pattern.
- The check that matters most is fail-closed behaviour for hard constraints and consent. If a consent read fails, the feature must not run. Check that `getWardrobeConsent` callers treat `undefined` and errors as "no consent", not "consent".
- `withdrawWardrobeConsent` runs items, outfits and consent in one transaction. Good: a failure cannot leave photos kept with consent withdrawn. Confirm the UI does not report success before `await` resolves.
- Client errors: no error-response contract exists yet. The API must return a generic message and a correlation ID (security guide 6). Not applicable until a handler returns errors.
- Set a request size limit and timeout on every write endpoint when they exist (security guide 6).

---

## Cross-cutting checks (not Top 10 categories, but report them under the closest category)

- **Secrets:** grep for keys, passwords, tokens and connection strings in tracked files. Exclude `compose.yaml` and `infra/dev/s3.json` only when they are the documented local stand-ins. Report any other hit as Critical. Never open `.env` files; the repo blocks them and you must not work around that.
- **18+ and EU-only:** check that no region other than `fr-par`, `nl-ams` or `pl-waw` is configured, and that no non-EU vendor endpoint is referenced (security guide 4). Map this to A02 or A06.
- **Body-talk guardrails:** banned words ("weight", "hide", "slimming", "unflattering") in user-facing copy. Map to A06, since security guide 8 calls it a safety control.
- **Identification:** no face recognition or cross-account matching code. Map to A06.

## Severity guide

- **Critical:** exploitable now, or leaks real personal, body or special-category data, or a live secret.
- **High:** a control the security guide requires is missing on a path that is live or about to ship, or a decision the open list reserves is made in code.
- **Medium:** a required control is missing but no path is live yet, or a weak default.
- **Low:** hardening, or a gap with no current exposure.
- **Info:** a good control worth keeping, or a note for the DPO or product owner.
