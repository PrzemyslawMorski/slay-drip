# Security guidelines

**Status:** Draft · **Owner:** Outfit Planner team · **Review:** before any real user data is collected, then every session

This guide sets the security rules for building Slay Drip. It applies to every change to code, infrastructure, CI and documentation. It turns the hard rules in [CLAUDE.md](../CLAUDE.md) and the privacy requirements in [requirements](requirements.md) into things a developer can check in a pull request.

Where a rule depends on an open decision (identity provider, DPO review, DPIA), it says so. Do not settle those in code. Raise them.

## 1. Who we protect and what we hold

- **Users:** adults aged 18+ in the EU, choosing outfits from their own wardrobe. Some of them will share details that are sensitive under GDPR (religious dress needs, health-related adaptive needs) and body measurements or photos.
- **Workshop data:** synthetic, freely licensed personas only. Never real people, never real photos.

### Data classification

| Class | Examples | Rules |
| --- | --- | --- |
| **Public** | Marketing copy, static assets, open-source code | No restriction beyond licence. |
| **Internal** | Build metadata, error codes, feature flags | Not user-linked. Safe in logs. |
| **Personal** | Account identifier, email, age confirmation, wardrobe items and tags, outfits, likes and rejects, wear history | Scoped to one user. Deleted on account deletion. Never in logs. |
| **Body data** | Measurements, body photos, colouring photos, proportion descriptors | Separate store with stricter access. Derived attributes kept by default. Raw photos only with opt-in. |
| **Special category (GDPR Art. 9 candidate)** | Modesty and cultural coverage rules, adaptive needs | Explicit consent required. Treat as sensitive everywhere. DPO review still open. |
| **Location and weather** | Coarse location for local weather | Separate consent. Store the minimum (city or rounded coordinates, not history). |
| **Secrets** | API keys, IAM keys, database URLs, signing keys | Never in the repo, client bundles, logs or docs. See section 9. |

Anything that is not obviously in one of these classes is **Personal** until someone decides otherwise.

## 2. Age gate (18+)

- Enforce 18+ **on the server at sign-up**. The client-side check is for user experience only and is never the control.
- Store the minimum needed to show the check was passed. Do not keep a date of birth unless the DPO confirms it is needed.
- A user who fails the gate gets no account and no personal data is written for them. Do not store the rejected age.
- Tests: an under-18 sign-up attempt is rejected by the API directly, bypassing the UI.

## 3. Consent and retention

- Consent is **granular and revocable** per data type: body photo, measurements, wardrobe photos, weather or location. Each is a separate record with a timestamp and the wording version the user saw.
- Every feature checks consent **on the server** before it reads or writes that data type. The UI hiding a feature is not enough.
- Revoking consent **deletes** that data type, not just stops using it. Build the deletion path with the consent switch, not later.
- Special-category fields need their own explicit consent. Do not bundle them into general onboarding consent.
- Retention: raw body photos are kept only while the user keeps the toggle on. Derived attributes are kept for as long as the account exists. Document any new retention period in the spec for the feature.

## 4. EU-only processing

- Hosting, storage, databases, queues and AI inference run **only in Scaleway EU regions**: `fr-par`, `nl-ams`, `pl-waw`. The default is `fr-par`.
- The API refuses to start outside that allow-list (F05). Do not add a region setting that bypasses it.
- **No new vendor, SDK or endpoint** without a check that: it processes data in the EU, it is covered by a DPA with zero retention and no training on user data, and it is recorded in an ADR. This includes CDNs, fonts, analytics, error tracking and AI models.
- Do not load third-party scripts or fonts from non-EU hosts. Self-host or use an approved EU host.
- Do not use AWS services, SDKs or credentials. The AWS stack is retired (see CLAUDE.md).

## 5. Authentication and authorisation

*The identity provider is an open decision (F02). Until it is chosen, do not ship any user-scoped endpoint.*

- Every route requires a verified token, except health checks and CORS preflight. Deny by default.
- Verify token signature, issuer, audience and expiry in the API. Do not trust decoded but unverified claims.
- Take the user identity **only from the verified token**, never from the request body, query string or a header the client controls.
- Every query on user data filters by owner. A user who requests another user's record gets **404**, not 403, so resource IDs cannot be probed.
- No table scans on user data paths. Add a test where user A cannot read, list or change user B's items or outfits.
- Sessions: short-lived access tokens, refresh handled in the identity provider, sign-out clears local state.

## 6. API and input handling

- Validate every request body: size limit, types, enums, required fields. Reject unknown fields on write endpoints.
- Generate IDs on the server (UUID). Do not accept client-supplied IDs on create.
- Errors: return a generic message and a **correlation ID**. Log the internal error with that ID. Never return database errors, stack traces or SQL text to clients (see F05).
- CORS: allow-list the app's own origin and localhost in dev only. Never `*` on an endpoint that handles user data.
- Rate-limit authentication and AI-backed endpoints. Set a request timeout on every outbound call.
- Use parameterised queries only. No string-built SQL.
- Responses for personal data send `Cache-Control: no-store`.

## 7. Images and body photos

- **Strip EXIF metadata** (GPS, device, timestamp) from every uploaded image before storage. Re-encode images rather than trusting the original.
- Check the real file type from its content, not the extension. Enforce a maximum size before upload is accepted.
- Store user images in private buckets. Use presigned URLs with short expiry. No public listing, ever.
- Body photos go to a **separate store and bucket** with narrower access than wardrobe photos.
- Auto-blur faces in stored photos where the feature allows it (requirement 7).
- **No identification.** No face recognition, face embeddings or matching users or photos across accounts. Body photos are never used to identify anyone. Code review rejects any change that adds this.
- Only send a photo to an AI model when the feature needs it, and only the part it needs.

## 8. AI features

- **Minimise what the model sees.** No names, emails, user IDs or location in prompts. Use an opaque per-request reference if the job needs one.
- **Treat all user text as untrusted** (free-text occasions, item names, notes). It is data, never instructions. Do not let model output choose tools, change permissions, or write to other users' data.
- **Hard constraints are enforced in code, not by the model.** Availability, weather, modesty and adaptive rules are filters that run after generation and before display. If the wardrobe cannot satisfy a request, return an honest "cannot" and a gap suggestion, not a weak outfit.
- **Body-talk guardrails are a safety control.** Banned language (weight, "hide", "slimming", "unflattering") is checked in prompts and in output. Adversarial tone tests run in CI (S4-03). A change that weakens them is a security regression.
- Log model name, version, token count and cost per user (F09). Do not log prompt or output text that contains personal or body data.
- Confirm each model's vendor terms: EU processing, zero retention, no training on our data. Record the choice in an ADR (F10).

## 9. Secrets and configuration

- **Never commit secrets.** `.env`, `.env.*`, `*.env` and `.envrc` are blocked by repo permissions and a hook. Do not work around the block. Ask the owner for values.
- **Anything compiled into a client bundle, or passed to it as a build variable, ships to every browser.** Never put a secret there. Only public configuration (API base URL, environment name) belongs in the client build.
- Server secrets (database URL, identity provider config) come from the Scaleway container environment, not from source or images.
- CI uses Scaleway IAM API keys from GitHub environment secrets. Scope each key to one environment and the least permissions needed.
- Rotate any secret that appears in a log, a commit, a chat, a screenshot or a PR. Treat it as leaked the moment it is seen.
- Keep dev and live data and credentials separate. Never copy live user data into dev.

## 10. Logging and monitoring

- **Log events, not content.** Allowed: request path, status, latency, correlation ID, user's internal ID (if needed for support, never email), error class.
- **Never log:** emails, names, body data, measurements, free text, photos, tokens, authorisation headers, prompts or model outputs.
- Redact by allow-list: log specific fields, not whole request or response bodies.
- Set a retention period for logs and state it in the privacy page. Keep access to logs to the people who need it.
- Alert on authentication failures, unusual deletion volume and repeated 5xx from the API.

## 11. Client app

- Serve the app over HTTPS only. Set a Content Security Policy that allows only our own origin and the approved API host.
- No inline scripts, no `eval`, no unpinned third-party scripts.
- Keep personal data in IndexedDB only as long as needed. Clear it on sign-out and on account deletion.
- Camera and location permissions: ask at the point of use, explain why in plain language, and degrade gracefully when refused.
- Show which signals each recommendation used (requirement 10). Do not hide AI use from the user.

## 12. Dependencies and supply chain

- Install dependencies from the committed lockfile only. Commit lockfile changes with the dependency change.
- Run the stack's static checks and tests in CI on every change.
- Review each new dependency: maintenance, licence, size, and whether it sends data anywhere.
- Pin CI tool versions (F06). Do not pull `latest` in pipelines.
- Container images come from our own Scaleway registry and a pinned base image.

## 13. Infrastructure

- Least privilege on every resource and IAM policy. No wildcard permissions without a written reason.
- The database is reachable only from the API container, never from the internet directly.
- Encryption at rest and in transit for every store that holds personal data. Check that Scaleway's defaults meet this and record any gap.
- Object storage buckets for user data are private. Public buckets hold only public static assets.
- Terraform changes that widen access or move data are reviewed by a second person.

## 14. Data subject rights

- Self-service in the app: view, export (JSON and images), and delete all data in one action (S7-01).
- Toggle raw photo retention and delete any single photo.
- Erasure removes data from live stores and propagates to backups within a defined window. The window is an open decision: define it before launch.
- Respond to any request outside the app within one month of receipt (GDPR Art. 12). Log the request, not the content.

## 15. Incident response and disclosure

- A personal data breach must be assessed quickly. If it is likely to risk people's rights, notify the competent supervisory authority **within 72 hours** (GDPR Art. 33). The authority and the notification route are an open decision for the DPO.
- Anyone who finds a vulnerability should be able to report it. Publish a security contact in `SECURITY.md` at the repo root before launch. The contact address is an open item.
- Do not publish exploit details before a fix is deployed.
- Keep a short incident runbook alongside this guide once the first incident exercise is run.

## 16. Testing and review

- Security tests run in CI: auth on every route, cross-user access (A cannot reach B), age gate, consent checks, CORS, error responses, EXIF stripping, banned-language checks.
- Red-team the app before the trust-hardening session closes (S7-03). Findings get tickets with a severity and an owner.
- Any change that touches personal, body or special-category data needs a reviewer who has read this guide.

## Pull request checklist

Copy this into PRs that touch user data, auth, storage, AI or infrastructure.

- [ ] Does it add or change personal, body or special-category data? If yes, which class and where is it stored?
- [ ] Is consent checked on the server, and does revoking it delete the data?
- [ ] Is every new data path scoped to the owner, with a test for cross-user access?
- [ ] Are all regions EU (`fr-par`, `nl-ams`, `pl-waw`)? Any new vendor recorded in an ADR with a DPA?
- [ ] Does it log anything personal? If so, remove it.
- [ ] Are errors generic to the client, with a correlation ID?
- [ ] Are secrets absent from code, client builds, logs and docs?
- [ ] Does it need a new ADR, spec or DPIA input?

## Open decisions

These block parts of this guide. Do not decide them in code.

- Identity provider for user accounts (F02).
- DPO review of special-category fields (modesty, adaptive needs) and whether age is stored at all.
- DPIA, completed before real user data is collected.
- Erasure window for backups.
- Supervisory authority and breach-notification route.
- Security contact and `SECURITY.md`.
- EU-hosted model choice (F10).
