// Helpers shared by the step definitions: opening the app, uploading, and reading on-device storage.
import type { Page, Request } from '@playwright/test';
import { en } from '../../src/strings/en';
import type { PhotoFile } from './photos';

const requestLog = new WeakMap<Page, Request[]>();

// Records every request the page makes, so the privacy scenario can check what leaves the device.
export function openApp(page: Page): Promise<unknown> {
  const requests: Request[] = [];
  requestLog.set(page, requests);
  page.on('request', (request) => requests.push(request));
  return page.goto('/');
}

export function requestsMade(page: Page): Request[] {
  return requestLog.get(page) ?? [];
}

export async function confirmAdult(page: Page): Promise<void> {
  await openApp(page);
  await page.getByRole('button', { name: en.age.adult }).click();
}

export async function addPhotos(page: Page, files: PhotoFile[]): Promise<void> {
  const chooserEvent = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: en.wardrobe.addPhotos }).click();
  const chooser = await chooserEvent;
  await chooser.setFiles(files);
}

export function itemCountLabel(count: number): string {
  return en.wardrobe.itemCount(count);
}

// Counts records in one on-device store. Returns 0 when the database or store does not exist.
export async function countStoredRecords(page: Page, store: 'items' | 'consent' | 'profile'): Promise<number> {
  return page.evaluate(async (storeName) => {
    const databases = await indexedDB.databases();
    if (!databases.some((database) => database.name === 'slay-drip-local')) {
      return 0;
    }
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('slay-drip-local');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      if (!db.objectStoreNames.contains(storeName)) {
        return 0;
      }
      return await new Promise<number>((resolve, reject) => {
        const request = db.transaction(storeName).objectStore(storeName).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }, store);
}

// Reads the stored bytes of a displayed photo and reports any metadata that survived.
export async function metadataFoundIn(page: Page, photoName: string): Promise<Record<string, boolean>> {
  const src = await page.getByRole('img', { name: photoName }).getAttribute('src');
  return page.evaluate(async (url) => {
    const bytes = new Uint8Array(await (await fetch(url!)).arrayBuffer());
    const text = new TextDecoder('latin1').decode(bytes);
    let app1Segment = false;
    for (let index = 0; index < bytes.length - 1; index++) {
      if (bytes[index] === 0xff && bytes[index + 1] === 0xe1) {
        app1Segment = true;
        break;
      }
    }
    return {
      exifHeader: text.includes('Exif'),
      deviceMake: text.includes('TestCamera'),
      gpsCoordinates: text.includes('GPS'),
      app1Segment,
    };
  }, src);
}
