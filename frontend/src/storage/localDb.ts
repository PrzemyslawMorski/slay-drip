// On-device storage for the frontend-only slice (ADR-0004). Nothing here is uploaded.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export const CONSENT_WORDING_VERSION = 1;

const DB_NAME = 'slay-drip-local';
const DB_VERSION = 2;
const WARDROBE_CONSENT_KEY = 'wardrobePhotos';
const AGE_PROFILE_KEY = 'age';

export interface WardrobeItem {
  id: string;
  // Label number ("Wardrobe item 3"). Fixed when the photo is added, so deleting another item does not renumber it.
  number: number;
  photo: Blob;
  addedAt: string;
}

// Items saved before S1-02 have no number. They are numbered by their position when read.
type StoredWardrobeItem = Omit<WardrobeItem, 'number'> & { number?: number };

export interface Outfit {
  id: string;
  name: string;
  // Wardrobe item ids, in the order the person selected them.
  itemIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OutfitDraft {
  id: string;
  name: string;
  itemIds: string[];
}

export interface ConsentRecord {
  granted: boolean;
  at: string;
  wordingVersion: number;
}

export interface AgeRecord {
  confirmedAt: string;
}

interface LocalDbSchema extends DBSchema {
  items: { key: string; value: StoredWardrobeItem };
  consent: { key: string; value: ConsentRecord };
  profile: { key: string; value: AgeRecord };
  outfits: { key: string; value: Outfit };
}

let dbPromise: Promise<IDBPDatabase<LocalDbSchema>> | undefined;

function openLocalDb(): Promise<IDBPDatabase<LocalDbSchema>> {
  dbPromise ??= openDB<LocalDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('items', { keyPath: 'id' });
        db.createObjectStore('consent');
        db.createObjectStore('profile');
      }
      if (oldVersion < 2) {
        db.createObjectStore('outfits', { keyPath: 'id' });
      }
    },
  });
  return dbPromise;
}

function byAddedAt(a: { addedAt: string }, b: { addedAt: string }): number {
  return a.addedAt.localeCompare(b.addedAt);
}

async function readWardrobeItems(db: IDBPDatabase<LocalDbSchema>): Promise<WardrobeItem[]> {
  const items = (await db.getAll('items')).sort(byAddedAt);
  return items.map((item, position) => ({ ...item, number: item.number ?? position + 1 }));
}

export async function getAgeConfirmed(): Promise<boolean> {
  const db = await openLocalDb();
  return (await db.get('profile', AGE_PROFILE_KEY)) !== undefined;
}

export async function confirmAdultAge(): Promise<void> {
  // Only the fact of confirmation is stored, never a date of birth (security guide, section 2).
  const db = await openLocalDb();
  await db.put('profile', { confirmedAt: new Date().toISOString() }, AGE_PROFILE_KEY);
}

export async function getWardrobeConsent(): Promise<ConsentRecord | undefined> {
  const db = await openLocalDb();
  return db.get('consent', WARDROBE_CONSENT_KEY);
}

export async function setWardrobeConsent(granted: boolean): Promise<void> {
  const db = await openLocalDb();
  const record: ConsentRecord = {
    granted,
    at: new Date().toISOString(),
    wordingVersion: CONSENT_WORDING_VERSION,
  };
  await db.put('consent', record, WARDROBE_CONSENT_KEY);
}

export async function listWardrobeItems(): Promise<WardrobeItem[]> {
  const db = await openLocalDb();
  return readWardrobeItems(db);
}

export async function addWardrobeItem(photo: Blob): Promise<void> {
  const db = await openLocalDb();
  const existing = await readWardrobeItems(db);
  const number = existing.reduce((highest, item) => Math.max(highest, item.number), 0) + 1;
  await db.add('items', {
    id: crypto.randomUUID(),
    number,
    photo,
    addedAt: new Date().toISOString(),
  });
}

// Deleting an item removes it from every outfit that uses it. An outfit left with no items is deleted.
// Returns the names of the outfits that were deleted, so the person can be told.
export async function deleteWardrobeItem(id: string): Promise<string[]> {
  const db = await openLocalDb();
  const tx = db.transaction(['items', 'outfits'], 'readwrite');
  const outfits = tx.objectStore('outfits');
  const deletedOutfitNames: string[] = [];
  const now = new Date().toISOString();
  await tx.objectStore('items').delete(id);
  for (const outfit of await outfits.getAll()) {
    if (!outfit.itemIds.includes(id)) {
      continue;
    }
    const itemIds = outfit.itemIds.filter((itemId) => itemId !== id);
    if (itemIds.length === 0) {
      await outfits.delete(outfit.id);
      deletedOutfitNames.push(outfit.name);
    } else {
      await outfits.put({ ...outfit, itemIds, updatedAt: now });
    }
  }
  await tx.done;
  return deletedOutfitNames;
}

export async function listOutfits(): Promise<Outfit[]> {
  const db = await openLocalDb();
  const outfits = await db.getAll('outfits');
  return outfits.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// Creates the outfit, or replaces the name and items of an existing one with the same id.
export async function saveOutfit(draft: OutfitDraft): Promise<void> {
  const db = await openLocalDb();
  const existing = await db.get('outfits', draft.id);
  const now = new Date().toISOString();
  await db.put('outfits', {
    id: draft.id,
    name: draft.name,
    itemIds: draft.itemIds,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

// Deleting an outfit never deletes its items.
export async function deleteOutfit(id: string): Promise<void> {
  const db = await openLocalDb();
  await db.delete('outfits', id);
}

// Withdrawing consent deletes the photos, the outfits and records the withdrawal in one transaction.
export async function withdrawWardrobeConsent(): Promise<void> {
  const db = await openLocalDb();
  const tx = db.transaction(['items', 'consent', 'outfits'], 'readwrite');
  await Promise.all([
    tx.objectStore('items').clear(),
    tx.objectStore('outfits').clear(),
    tx.objectStore('consent').put(
      { granted: false, at: new Date().toISOString(), wordingVersion: CONSENT_WORDING_VERSION },
      WARDROBE_CONSENT_KEY,
    ),
    tx.done,
  ]);
}
