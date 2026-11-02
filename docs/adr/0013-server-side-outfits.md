# ADR-0013: Where outfits live for signed-in people

**Status:** Accepted
**Date:** 2026-11-02
**Deciders:** Outfit Planner team. Proposed by the architect role (S1-06.01). Accepted on the product owner's instruction (2026-11-02). All eight open questions were answered on 2026-11-02 (see Answers recorded). DPO review of the store was accepted on 2026-11-02 by the interim DPO.
**Related:** [S1-06.01](../specs/S1-06.01-propose-server-side-outfits-adr.md), [S1-06](../specs/S1-06-mcp-server-access.md), [S1-06.13](../specs/S1-06.13-outfits-store-postgresql.md) (store, blocked on this ADR), [S1-02](../specs/S1-02-manual-outfit-creation.md) (on-device outfits), [ADR-0004](0004-on-device-wardrobe-storage.md) (on-device storage, not amended here), [ADR-0008](0008-postgresql-data-store-and-migrations.md) (PostgreSQL), [ADR-0010](0010-identity-provider-keycloak.md) (account deletion through Keycloak), [ADR-0012](0012-mcp-server-transport-and-auth.md) (MCP transport and auth), [requirements](../requirements.md) (F3.7, F6, F7), [security guide](../security.md) (§3, §5, §6, §8, §10, §13, §14), [consent and GDPR rules](../code-review/consent-and-gdpr.md)

## Context

Outfits are personal data. The security guide lists them under Personal (section 1) and says they are scoped to one user and deleted with the account.

Today outfits exist only in the browser. S1-02 and ADR-0004 (amended for S1-02) keep them in the `outfits` IndexedDB store, under the wardrobe-photo consent. The server has no outfit data. The server does hold wardrobe metadata: the `consents` and `wardrobe_items` tables (`backend/migrations/000001_wardrobe.up.sql`), with photo bytes in S3-compatible object storage. Revoking the wardrobe-photo consent already deletes the owner's items in one transaction. That is verified in the Go code: `SetConsent` in `backend/internal/db/wardrobe.go` runs one transaction that deletes the owner's `wardrobe_items` rows. The BE-48 citation in the migration comment refers to the consent check in the backend ruleset, not to the deletion, so this ADR cites the code, not BE-48, for the deletion.

S1-06 needs `outfit_create` and `outfit_list` for an MCP client (F7.1). An MCP client cannot read IndexedDB, and the MCP layer keeps no state between calls (S1-06, Data and storage). So a signed-in person's outfits need a server-side store. That store is new personal data in a new place, and it needs a decision before code depends on it.

**Conflict with F3.7.** [requirements](../requirements.md) F3.7 says saved outfits "stay on the device and follow the wardrobe-photo consent (S1-02)". A server-side store for signed-in people does not fit that wording as written. This ADR does not amend F3.7. The owner must decide whether to amend it (see open questions).

Facts that constrain the choice:

- **EU-only.** Any store runs on Scaleway in `fr-par`, `nl-ams` or `pl-waw`. ADR-0008 requires the region to be confirmed on the database resource before personal data is stored.
- **Owner scope.** Every query filters by the token's `sub`. A foreign or missing item ID returns "not found" (security guide §5; S1-06 scenario "A person cannot act on another person's items").
- **Referential integrity.** An outfit may only use items its owner owns, and deleting an item must remove it from outfits. ADR-0004 states these rules for the device store, and the server store needs them too.
- **Consent.** Outfits are not a separate consent type today. ADR-0004 makes them follow the wardrobe-photo consent. Withdrawing that consent must delete them (security guide §3).
- **Erasure.** Account deletion (planned S7-01, F6.1) must remove outfits, and the export (F6.1) must include them.
- **Transactions.** Consent withdrawal and account deletion must run in one transaction across the affected tables (ADR-0008, ADR-0004).
- **Local run.** The store must run in the local PostgreSQL stand-in with the same engine (ADR-0005, ADR-0008).
- **Anonymous use.** Anonymous outfits stay on the device (S1-02). This ADR does not change that.

## Decision

Accepted: **Option A**. Store signed-in people's outfits in the same PostgreSQL database as their wardrobe, as an `outfits` table and an `outfit_items` join table. Both tables carry `owner_sub`, and the join table has composite foreign keys to `outfits (owner_sub, id)` and `wardrobe_items (owner_sub, id)`. The database then rejects any row that links an outfit to an item owned by someone else. Outfits follow the wardrobe-photo consent and are erased with the items.

This recommendation does not choose the store for anyone. The owner must answer the open questions below before S1-06.13 starts.

## Options considered

### Option A: Normalised tables in the existing PostgreSQL database, owner-scoped foreign keys (recommended)

- Pros:
  - Same engine and database as the wardrobe (ADR-0008). No new vendor, service or region.
  - The composite keys `(owner_sub, id)` on `outfits` and `wardrobe_items`, used by `outfit_items`, make a link between one owner's outfit and another owner's item impossible at the database level. The insert fails with a foreign-key violation. The repository maps that violation to "not found" without revealing whether the item exists. The database does not return "not found" itself.
  - `ON DELETE CASCADE` from `wardrobe_items` to `outfit_items` removes a deleted item from every outfit. It does not remove outfits left with no items. That needs a trigger or application code in the same transaction.
  - Consent withdrawal and account deletion run in one transaction across `outfits`, `outfit_items`, `wardrobe_items` and `consents` (ADR-0008).
  - Listing is an indexed query by owner, with no table scan (security guide §5).
- Cons:
  - Two tables and a composite key to write and review by hand (ADR-0008 accepts this).
  - The `wardrobe_items` table needs a unique key on `(owner_sub, id)` to be a foreign-key target. This is a small change to the wardrobe migration, which must be a new forward migration, not an edit of `000001`. To avoid a long lock on the existing table, the migration uses `CREATE UNIQUE INDEX CONCURRENTLY`, then `ALTER TABLE wardrobe_items ADD CONSTRAINT ... UNIQUE USING INDEX`. S1-06.13 must confirm this plan against the migration tooling before it runs.

### Option B: One `outfits` table, with item IDs in a JSON array

- Pros:
  - One table, so the schema is smaller and faster to write.
  - Matches the device store's shape (a name, an ordered list of item IDs and two timestamps) most closely.
- Cons:
  - No database-level check that the item IDs belong to the owner or exist. Every check moves into code, which is the failure mode the rules warn about.
  - Deleting an item does not cascade. Item removal must rewrite every outfit row, and a missed path leaves stale IDs. Stale IDs can also be probed.
  - Querying which outfits use an item (needed for item deletion) requires scanning JSON.

### Option C: Outfits stay on the device, even for signed-in people

- Pros:
  - No new personal data store on the server. ADR-0004 and S1-02 are unchanged, and the EU-only and erasure questions do not arise for outfits.
  - Smallest scope for the owner to review now.
- Cons:
  - Conflicts with F7.1, which requires an MCP client to create and save outfits, and with the S1-06 goal "create an outfit from their own items". An MCP tool cannot write to a device it cannot reach.
  - To satisfy F7.1 the client would have to hold outfit state across calls, which the stateless MCP handler (ADR-0012) and the "no state between calls" rule forbid.
  - `outfit_create` and `outfit_list` would have no honest result for a signed-in person, which the spec does not allow.
  - Recorded here because it is the zero-new-store path. It is not recommended, because it removes the MVP capability the spec exists to deliver.

### Option D: Outfit documents in S3-compatible object storage

- Pros:
  - Reuses the object store already in use for photos. No new table.
- Cons:
  - No indexed listing by owner. Listing needs a scan or a second index store.
  - Deleting an outfit and its item references cannot run in one transaction with the wardrobe rows. Consent withdrawal would need an eventual-consistency job, which is more to review than Option A.
  - Owner checks would sit in code only, as in Option B, with weaker guarantees.

**Out of scope for this ADR:** full sync, where the server becomes the source of truth for all outfits and the device becomes a cache. ADR-0004 says that sync design needs its own ADR. The choice here does not block it, because Option A keeps the server rows keyed by server-minted UUIDs.

## Proposed design for Option A (for review; detail goes to S1-06.13)

- **Tables.**
  - `outfits (id uuid, owner_sub text not null, name text not null, created_at, updated_at, primary key (id), unique (owner_sub, id))`. Names are free text and are stored as personal data.
  - `outfit_items (outfit_id uuid not null, owner_sub text not null, item_id uuid not null, position smallint, primary key (outfit_id, item_id), foreign key (owner_sub, outfit_id) references outfits (owner_sub, id) on delete cascade, foreign key (owner_sub, item_id) references wardrobe_items (owner_sub, id) on delete cascade)`.
  - `wardrobe_items` needs `unique (owner_sub, id)` added by a new forward migration.
  - Because both foreign keys include `owner_sub`, a row whose two owners differ cannot be inserted.
- **IDs.** The server generates every ID (security guide §6). No client-supplied IDs.
- **Owner scope.** Every repository query filters by `owner_sub` from the verified token. A missing or foreign ID is reported to the client as "not found". The database error for a foreign link is mapped to that answer in the repository.
- **Consent.** The consent check runs on the server before every read or write, as for wardrobe items (security guide §3). Consent withdrawal removes outfits, which is part of the withdrawal transaction below.

## Consent and erasure path for the store

The store is erased on four events. Each runs in one database transaction unless noted.

1. **Withdrawal of wardrobe-photo consent (the consent switch).** In one transaction: set `consents` to not granted, delete the owner's `outfits` (which cascades to `outfit_items`), and delete the owner's `wardrobe_items`, as `SetConsent` already does for items. Object-storage deletion of the photo bytes runs after the commit, because S3 cannot join the transaction. A failed object delete must be retried from a recorded list of keys, so no photo bytes are left without a row. The retry mechanism needs its own ticket.
2. **Deleting one wardrobe item (F6.2).** Delete the item and its object. The cascade removes it from every outfit. The cascade does not delete outfits left with no items, so a trigger or application code must do that in the same transaction, as ADR-0004 requires.
3. **Account deletion (planned S7-01, F6.1).** In one transaction: delete the owner's outfits, items and consent rows. Then delete the photo objects and call the Keycloak Admin API with the least-privilege service client to delete the user and revoke sessions (ADR-0010). The order of the external calls needs a runbook.
4. **Export (F6.1, planned S7-01).** Outfits are included in the JSON export, with item IDs and names, and no other owner's data.

**Backups.** Erasure from live tables is covered above. Erasure from database backups follows the window in security guide §14, which is an open decision. Until the owner sets it, the ADR does not claim backup erasure.

**Not covered yet.** No retention period is set for outfits. Proposed: kept while the wardrobe-photo consent is granted and the account exists. This needs a written period in the S1-06.13 spec before the store is built (consent-and-gdpr rules).

## Compliance check

- [x] EU-only processing. Option A runs in the same Scaleway PostgreSQL as the wardrobe, in `fr-par`, `nl-ams` or `pl-waw`. The region must be confirmed on the database resource before any outfit is stored (ADR-0008). No vendor receives outfit data.
- [x] Consent and retention impact. Outfits are Personal data. They follow the wardrobe-photo consent, and withdrawal deletes them in the same transaction as the items. The retention period and the backup erasure window are open (see above).
- [ ] Special-category data impact. Not ticked. Outfit names are free text and are not checked for content. A name such as one that reveals religious practice or a health condition would be special-category data. The store must not hold occasion text, modesty or adaptive-needs fields. Any such field needs its own explicit consent and DPO review.
- [x] Hard constraints remain hard filters. Not affected by the store. `outfit_create` saves items the person picked and does not run the availability or weather filters. This is noted for the spec: a manual save does not claim to be a recommendation.
- [x] Test data is synthetic. Tests use `*@example.test` personas and generated IDs only.

Logging: outfit names, item names and item IDs must not be logged (security guide §10, BE-35).

**DPO review: accepted on 2026-11-02 by the interim DPO.** The outfit store and its consent and erasure path were reviewed before any personal data is written to it (ADR-0001, ADR-0008).

## Open questions for the owner

These are not decided here. The owner answers them in the ADR review.

1. **Anonymous and signed-in split (the question from S1-06.01).** Should anonymous users keep on-device outfits only, while signed-in users get server-side outfits? This ADR assumes yes, because S1-02 and ADR-0004 must not change for anonymous use.
2. **Signed-in people who already have device outfits.** When a person signs in, do their device outfits stay on the device, get copied to the server, or get merged? Copying is a sync question that needs its own ADR, under ADR-0004's follow-up.
3. **Consent for outfits.** Should outfits keep following the wardrobe-photo consent (ADR-0004), or get their own consent record? The security guide's granular list does not name outfits. This is a DPO and product call.
4. **Retention period for outfits.** Is "kept while the account and consent exist" acceptable, or does the DPO set a period?
5. **Backup erasure window.** Security guide §14 is open. Without it, the erasure path above is incomplete for backups.
6. **Database region.** Which of `fr-par`, `nl-ams` or `pl-waw` the PostgreSQL resource uses (ADR-0008 and ADR-0010 both leave this open).
7. **Option choice.** Accept Option A, choose another option, or defer the store. Option C would remove F7.1's outfit tools for signed-in people, so it needs an explicit product decision and a requirement change.
8. **Amending F3.7.** F3.7 says saved outfits stay on the device and follow the wardrobe-photo consent. Option A stores signed-in people's outfits on the server, so F3.7 must be amended for that case, or the server store must be rejected. Whether to amend F3.7 is a product owner decision. This ADR does not change `requirements.md`.

**Answers recorded (2026-11-02)**

- Q1 (anonymous and signed-in split): **Yes, split.** Anonymous users keep outfits on the device only. Signed-in users get server-side outfits.
- Q2 (device outfits at sign-in): **Stay on device.** Existing device outfits are not copied or merged at sign-in. No sync ADR is needed for this.
- Q3 (consent for outfits): **Follow wardrobe-photo consent.** No new consent type. Withdrawal deletes outfits in the same transaction as items. The DPO review still applies.
- Q4 (retention): **Kept while the account and consent exist.** The S1-06.13 spec must write this period down before the store is built. The DPO review still applies.
- Q5 (backup erasure window): **6 months, for now.** This is a provisional answer. Security guide §14 is not updated here, and the DPO review still applies.
- Q6 (database region): **fr-par, accepted on 2026-11-02 by the DPO.** The database resource is provisioned in `fr-par` (ADR-0008).
- Q7 (option choice): **Accept Option A.** The Decision section already records this. Options B, C and D stay rejected.
- Q8 (amending F3.7): **Amend F3.7, confirmed on 2026-11-02 by the product owner.** The wording is amended in `requirements.md`. This ADR does not change `requirements.md`.
- DPO review (2026-11-02): **Accepted by the interim DPO.** Personal data may be written to the store once S1-06.13 is built. S1-06.23 implements the photo-deletion retry.

## Consequences

- Positive: a clear, testable store design. Cross-owner use is blocked by the database as well as the code. Item deletion and consent withdrawal reuse the transactions the wardrobe already needs.
- Negative: a new personal data store that needs DPO review first. Erasure from S3 and from backups are outside the database transaction and need their own work. Outfits are a second category of data the export and deletion code must cover.
- Follow-up work (link specs or tasks):
  - Owner answers the open questions above (this ADR review).
  - Product owner decides whether to amend F3.7 in `requirements.md` for signed-in server-side outfits (open question 8). Not done in this ADR.
  - DPO review of the outfit store (ADR-0001, ADR-0008).
  - Confirm the Scaleway region for the database resource (ADR-0008).
  - S1-06.13: forward migration for `outfits` and `outfit_items`, and the `(owner_sub, id)` unique key on `wardrobe_items`, added with `CREATE UNIQUE INDEX CONCURRENTLY` and then `ALTER TABLE ... ADD CONSTRAINT ... UNIQUE USING INDEX`, with the plan checked before it runs. Do not edit `000001_wardrobe`. Tests for the cross-owner foreign key and the erasure paths.
  - S1-06.14 and S1-06.21 use the repository only. They do not query the tables directly.
  - A retry mechanism for S3 deletion after a withdrawal or account deletion.
  - Add outfits to the export (planned S7-01).
  - A separate ADR for full sync, if the owner wants the server to become the source of truth for outfits (ADR-0004 follow-up).
  - Amendment to ADR-0004 only if the owner accepts the split in question 1. That amendment is a separate owner decision and is not made here.

## Revisit when

- The owner accepts a different option, or chooses to defer the store. Then supersede this ADR.
- The DPO review changes the consent basis or the retention period for outfits.
- Outfit names, notes or occasion text need to be stored in a way that could reveal special-category data.
- Full sync of outfits between device and server is requested (ADR-0004 follow-up).
- The wardrobe store moves away from PostgreSQL (ADR-0008 revisit).
