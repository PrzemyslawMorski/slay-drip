# Discovery: can the local stack reach the 10 s cold-start budget

**Date:** 2026-11-15
**Author:** architect (spike S1-08.01)
**Status:** Concluded
**Outcome:** Input to [ADR-0016](../adr/0016-per-worktree-local-stack.md) (still Proposed) and [S1-08](../specs/S1-08-local-stack.md). The 10 s budget needs an owner decision; see Recommendation.

## Problem

ADR-0016 and S1-08 set a 10 s wall-clock budget for `up.py up` from a stopped project, with images already present. The budget has not been measured. This spike times the existing `compose.yaml` as it is today, step by step, to decide whether 10 s is reachable before ADR-0016 is accepted.

## Questions

1. What is the time to healthy for each service from a stopped project with volumes wiped?
2. Where is the critical path, and what is inside Keycloak's start?
3. Is 10 s reachable with the current design, and by what margin?
4. Which changes would make it reachable, and at what estimated cost?

## Method

- Host: Windows 11 Pro 10.0.26200, Docker Desktop 29.9.3, Git Bash, Python 3.13 (stdlib timer).
- Images already present: `postgres:17`, `chrislusf/seaweedfs:4.22`, `keycloak/keycloak:26.8.1`. No Node image.
- Protocol: `docker compose down -v`, then `docker compose up -d database object-storage keycloak`, then poll every 100 ms. Database and Keycloak are ready when `docker inspect` reports `healthy`. Object storage has no compose healthcheck, so it counts as ready when TCP 8333 accepts a connection. Three runs, 2026-11-15.
- Keycloak internal timings are from `docker compose logs keycloak` of run 3.
- Not measured: a cache-hit API image build (see Findings), golang-migrate (not cached), the Keycloak token check.

## Findings

### Per-step timings (seconds from `up` issued)

| Step | Run 1 | Run 2 | Run 3 | Median | Worst | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `compose up -d` command returns | 2.44 | 2.33 | 2.66 | 2.44 | 2.66 | Creates containers only |
| PostgreSQL healthy | 7.08 | 6.25 | 6.60 | 6.60 | 7.08 | `pg_isready`, 2 s interval |
| S3 (SeaweedFS) port answers | 5.46 | 4.70 | 5.25 | 5.25 | 5.46 | No healthcheck; TCP probe |
| Keycloak healthy | 48.92 | 44.19 | 43.82 | 44.19 | 48.92 | Critical path |
| All three healthy | 48.92 | 44.19 | 43.82 | 44.19 | 48.92 | Equal to Keycloak |
| `compose down -v` (before each run, not budgeted) | 1.21 | 5.41 | 5.32 | | | |

Other steps, one run each:

| Step | Time | Notes |
| --- | --- | --- |
| Bucket create plus S3 round trip (`scripts/dev/s3_smoke.py`) | 1.69 s | Includes Python start; passed |
| API start from the existing image (`compose up -d --no-build api`) | 2.16 s to `/healthz` 200 | Image is 13 days old, not rebuilt |
| API cache-hit build (`compose build api`) | Not measured | Base layers not cached, see below |
| Migrations (golang-migrate) | Unmeasured | No golang-migrate binary or image cached |
| Keycloak token check for the test user | Unmeasured | Not run |

### Keycloak start breakdown (run 3, container started at 19:15:09.2)

| Phase | Time from container start | Source |
| --- | --- | --- |
| Quarkus build augmentation (`start-dev` rebuilds) | 7.3 s to 23.9 s, 11.5 s | Log line "Quarkus augmentation completed in 11529ms" |
| Database schema initialisation (Liquibase, dev H2) | about 33.5 s, about 10 s after augmentation | Log "Initializing database schema" |
| Realm import (`--import-realm`) | 41.6 s to 45.8 s, about 4 s | Log "Realm 'slay-drip' imported" |
| Listening (Quarkus "started in 22.3s") | 46.5 s | Log |
| Health check first passes | 49.5 s | Health log: exit 1 at 39.4 s and 44.4 s, exit 0 at 49.5 s |

Health probing runs every 5 s, so the detected time lags the listening time by up to 5 s.

### API image build is not a cache hit on this host

`backend/Dockerfile` pins `golang:1.27.3` and `gcr.io/distroless/static-debian12:nonroot`. Only `golang:1.27` is cached, and distroless is not cached at all. The build spent over 180 s pulling base layers. It was stopped before it finished, so the API build time is unmeasured. The build is outside the 10 s budget by ADR-0016, but first-run pulls must be scripted ahead of time.

### Inferred

- Keycloak in `start-dev` mode spends about 11.5 s rebuilding its Quarkus augmentation on every start, because the image is not pre-built.
- The dev H2 store builds its schema on every start because volumes are fresh. Keeping the volume would skip most of the roughly 10 s schema step, but the realm would then persist as well.
- Everything except Keycloak finishes in about 7 s, so parallel start does not shorten the path. The API starts only after Keycloak and PostgreSQL are healthy.

## Options

Estimates only. None of these has been measured.

| Option | Fit with requirements | Cost / effort | Risk | Estimated Keycloak saving |
| --- | --- | --- | --- | --- |
| A. Pre-built Keycloak image (`kc.sh build` at image build, then `start --optimized --import-realm`) | Keeps Keycloak and ADR-0010; adds a Dockerfile | Low, one infra ticket | Low | About 11–12 s |
| B. Shorter health interval (`start_interval` 1 s instead of 5 s) | Compose-only change | Very low | Low; needs Docker 25+ (we have 29.9.3) | About 2–4 s |
| C. Keycloak DB that persists across runs (schema kept, realm re-imported or rendered each run) | Changes ADR-0010 data handling; needs owner decision | Medium | Medium: realm origin per worktree must be re-applied | About 8–10 s on repeat runs only |
| D. Smaller realm file | Fits the current design | Low | Low | About 1–2 s |
| E. Keycloak kept running across worktrees (shared service) | Conflicts with ADR-0016 Option B | Medium | High: shared state | Removes Keycloak from the budget |

## Recommendation

**Verdict: 10 s is not reachable for a cold, volume-wiped start with the current compose design.** The median is 44.2 s, which is 34 s (4.4 times) over budget. The best run was 43.8 s. Options A and B together bring the estimate to about 29 s. Adding C on repeat runs would bring it to about 19 s. None of these gets under 10 s.

Recommended next steps for the owner (not decided here):

1. Choose a budget that matches what is achievable. Option: keep 10 s for `up.py up` with a running Keycloak (warm: postgres, S3 and API restart only, which is about 7 s plus the unmeasured checks), and report cold start separately with a target near 30 s after options A and B. This needs an ADR-0016 change before acceptance.
2. If 10 s cold is required, the owner must choose between option C (Keycloak persistence) and option E (shared Keycloak). Option E conflicts with the per-worktree design, so C is the only realistic path in this design.
3. In either case, implement option A and option B. They are cheap and do not depend on the budget choice.
4. Pre-pull the pinned base images (`golang:1.27.3`, `gcr.io/distroless/static-debian12:nonroot`) and the golang-migrate image in a setup step, so that the budget applies to cache-hit runs only.

Not doing: no change to compose, scripts or ADRs. ADR-0016 stays Proposed. The identity provider is not changed.

## Open questions

- Owner: is the 10 s budget for cold start, warm start, or both? See Recommendation 1.
- Owner: is a persistent Keycloak database (option C) acceptable under ADR-0010?
- Infra: measure options A and B on this host, and time golang-migrate once it is cached (migrations are unmeasured).
- Infra: measure the cache-hit API build after the pinned base images are pulled.
- Infra: measure the Keycloak token check for the test user.

## Related finding: S1-07 containerised tooling status

Checked on `main` history and this worktree. Only one part of S1-07 has landed.

- **S1-07.10 (API and web in compose): partly landed.** The `api` service is in `compose.yaml:61` and `backend/Dockerfile:4,13` (commit `d0dbf19`). The `web` service is absent. `grep` finds no `web:` in `compose.yaml`.
- **S1-07.06 (Go tool container): not landed.** `backend/Dockerfile` has only `build` and `distroless` stages. `docs/local-development.md:39-42` still runs `go tool golangci-lint` and `go tool govulncheck` on the host.
- **S1-07.07 (Node and Playwright image): not landed.** No `frontend/Dockerfile`. `frontend/package.json` scripts run on the host.
- **S1-07.08 (Playwright in container): not landed.** No Playwright service in `compose.yaml`.
- **S1-07.09 (Python tool container): not landed.** No tool image. The smoke scripts run on the host.
