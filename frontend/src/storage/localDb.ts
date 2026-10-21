// On-device storage for the frontend-only slice (ADR-0004). Nothing here is uploaded.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export const CONSENT_WORDING_VERSION = 1;

const DB_NAME = 'slay-drip-local';
const DB_VERSION = 1;
const WARDROBE_CONSENT_KEY = 'wardrobePhotos';
const AGE_PROFILE_KEY = 'age';

export interface WardrobeItem {
  id: string;
  photo: Blob;
  addedAt: string;
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
  items: { key: string; value: WardrobeItem };
  consent: { key: string; value: ConsentRecord };
  profile: { key: string; value: AgeRecord };
}

let dbPromise: Promise<IDBPDatabase<LocalDbSchema>> | undefined;

function openLocalDb(): Promise<IDBPDatabase<LocalDbSchema>> {
  dbPromise ??= openDB<LocalDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('items', { keyPath: 'id' });
      db.createObjectStore('consent');
      db.createObjectStore('profile');
    },
  });
  return dbPromise;
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
  const items = await db.getAll('items');
  return items.sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

export async function addWardrobeItem(photo: Blob): Promise<void> {
  const db = await openLocalDb();
  await db.add('items', {
    id: crypto.randomUUID(),
    photo,
    addedAt: new Date().toISOString(),
  });
}

// Withdrawing consent deletes the photos and records the withdrawal in one transaction.
export async function withdrawWardrobeConsent(): Promise<void> {
  const db = await openLocalDb();
  const tx = db.transaction(['items', 'consent'], 'readwrite');
  await Promise.all([
    tx.objectStore('items').clear(),
    tx.objectStore('consent').put(
      { granted: false, at: new Date().toISOString(), wordingVersion: CONSENT_WORDING_VERSION },
      WARDROBE_CONSENT_KEY,
    ),
    tx.done,
  ]);
}
