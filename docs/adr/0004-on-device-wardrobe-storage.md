# ADR-0004: Wardrobe photos stored on the device in IndexedDB

**Status:** Proposed
**Date:** 2026-10-21
**Deciders:** Outfit Planner team (product owner and DPO to review)
**Related:** [S1-01](../specs/S1-01-anonymous-wardrobe-upload.md), [ADR-0001](0001-eu-hosting-18plus-gate-gdpr-baseline.md), [ADR-0002](0002-frontend-framework-and-build-tooling.md), [security guide](../security.md) (sections 1, 3, 7, 11), [requirements](../requirements.md) (F2.2, F6)

## Context

Slice S1-01 lets a person add photos of their clothes and view them without an account, with no backend. Wardrobe photos are **Personal** data under the security guide (section 1), so they need consent, deletion on revocation, EXIF removal and no logging.

Three facts constrain the storage choice:

- There is no server in this slice, so the photos must live in the browser or nowhere.
- Viewing the wardrobe after a reload is expected, so storage must survive a reload.
- Consent must be granular and revocable, and withdrawing it must delete the photos (security guide, section 3).

The security guide (section 11) allows personal data in IndexedDB only as long as it is needed, and requires it to be cleared on sign-out and account deletion. There is no sign-out in this slice, so the withdrawal action is the deletion path.

## Decision

We will store wardrobe photos as Blobs in **IndexedDB** on the device, through the `idb` wrapper, in one database named `slay-drip-local`. The database holds three object stores:

- `items`: one record per photo, with a server-free UUID key, the JPEG Blob (EXIF removed before storage) and the time it was added.
- `consent`: one record per data type, with `granted`, the time, and the wording version the person saw (security guide, section 3).
- `profile`: one record with the age confirmation (`confirmedAt`). No date of birth is stored (security guide, section 2).

Photos are never uploaded. Withdrawing consent for wardrobe photos clears the `items` store and records the withdrawal in `consent`.

## Options considered

### Option A: IndexedDB with Blobs (chosen)

- Pros: stores binary data without base64 overhead. Asynchronous and large enough for a wardrobe of photos. Survives reloads. Supported in iOS Safari and Android Chrome.
- Cons: the browser may evict data under storage pressure, and Safari can clear data for sites not added to the home screen after a period of disuse. Deleting by consent must clear every store.

### Option B: localStorage

- Pros: simplest API.
- Cons: about 5 MB limit and synchronous. Stores strings only, so photos would need base64, which is roughly a third larger. Unsuitable for photo data.

### Option C: Origin Private File System (OPFS)

- Pros: efficient file storage, good for large binary data.
- Cons: no indexed queries, so the metadata and consent records would need a second store anyway. Support and tooling are newer for the Safari versions we target. Would not reduce the work of deletion.

### Option D: In-memory only

- Pros: nothing persists, so deletion is trivial and privacy risk is lowest.
- Cons: the wardrobe is lost on reload, which fails the "still shows its items after reload" scenario in S1-01 and makes the app unusable as a wardrobe.

## Consequences

- Positive: photos survive reloads and stay on the device. Deletion is one transaction over three stores. Nothing personal reaches a server, so the EU-only rule is met trivially in this slice.
- Negative: the browser may evict the data. Users who clear site data lose the wardrobe with no recovery. The app must say so in its privacy text, with the withdrawal action.
- Follow-up work:
  - When a backend exists, IndexedDB becomes a local cache. The server becomes the source of truth, and the sync design needs its own ADR.
  - Offline and persistence (`navigator.storage.persist()`) is a later ticket, once the PWA shell exists.
  - Body photos use a separate store with narrower access (security guide, section 7). That is not part of this slice.

## Compliance check

- [x] EU-only processing: data never leaves the device in this slice.
- [x] Consent and retention impact: consent is granular and recorded with a timestamp and wording version. Withdrawal deletes the photos. Deletion is tested.
- [x] Special-category data impact: none in this slice. Modesty and adaptive fields are out of scope.
- [x] Hard constraints remain hard filters: not applicable.
- [x] Test data is synthetic: tests generate their own images.

## Revisit when

- A backend or sync ticket starts, so the server becomes the source of truth.
- Body photos or special-category fields are stored in the browser.
- Eviction or storage loss is reported by pilot users.
- The DPO's review of data classes changes what counts as Personal.
