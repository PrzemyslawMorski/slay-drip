// Helpers shared by the step definitions: opening the app, moving between screens, uploading, saving outfits and reading on-device storage.
import { expect, type Page, type Request } from '@playwright/test';
import { en } from '../../src/strings/en';
import { samplePhotoFile, type PhotoFile, type PhotoFormat } from './photos';

const requestLog = new WeakMap<Page, Request[]>();

// Records every request the page makes, so the privacy scenarios can check what leaves the device.
export function openApp(page: Page): Promise<unknown> {
  const requests: Request[] = [];
  requestLog.set(page, requests);
  page.on('request', (request) => requests.push(request));
  return page.goto('/');
}

export function requestsMade(page: Page): Request[] {
  return requestLog.get(page) ?? [];
}

export function expectOnlyAppRequests(page: Page): void {
  const appOrigin = new URL(page.url()).origin;
  const requests = requestsMade(page);
  expect(requests.length).toBeGreaterThan(0);
  for (const request of requests) {
    expect(new URL(request.url()).origin, request.url()).toBe(appOrigin);
    expect(request.method(), request.url()).toBe('GET');
    expect(request.postData(), request.url()).toBeNull();
  }
}

export async function confirmAdult(page: Page): Promise<void> {
  await openApp(page);
  await page.getByRole('button', { name: en.age.adult }).click();
}

// Moves to the wardrobe or the outfit list using the main navigation. Does nothing if that screen is already showing.
export async function goTo(page: Page, screen: 'wardrobe' | 'outfits'): Promise<void> {
  const heading = page.getByRole('heading', {
    level: 1,
    name: screen === 'wardrobe' ? en.wardrobe.heading : en.outfits.heading,
  });
  if (await heading.isVisible()) {
    return;
  }
  await page.getByRole('button', { name: screen === 'wardrobe' ? en.nav.wardrobe : en.nav.outfits }).click();
  await expect(heading).toBeVisible();
}

export async function addPhotos(page: Page, files: PhotoFile[]): Promise<void> {
  await goTo(page, 'wardrobe');
  const chooserEvent = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: en.wardrobe.addPhotos }).click();
  const chooser = await chooserEvent;
  await chooser.setFiles(files);
}

// Adds synthetic photos. Seeds start at firstSeed so that later batches get different colours.
export async function addSamplePhotos(page: Page, count: number, format: PhotoFormat = 'JPEG', firstSeed = 0) {
  const files: PhotoFile[] = [];
  for (let seed = firstSeed; seed < firstSeed + count; seed++) {
    files.push(await samplePhotoFile(page, format, seed));
  }
  await addPhotos(page, files);
}

// Builds an outfit through the screens, the same way a person would.
export async function saveOutfitThroughUi(page: Page, name: string, itemNames: string[]): Promise<void> {
  await goTo(page, 'wardrobe');
  await page.getByRole('button', { name: en.outfits.create }).click();
  for (const itemName of itemNames) {
    await page.getByRole('button', { name: itemName, exact: true }).click();
  }
  if (name !== '') {
    await page.getByLabel(en.builder.nameLabel).fill(name);
  }
  await page.getByRole('button', { name: en.builder.save }).click();
  await expect(page.getByRole('heading', { level: 1, name: en.outfits.heading })).toBeVisible();
}

// The card for one saved outfit on the outfit list.
export function outfitCard(page: Page, name: string) {
  return page.getByRole('listitem').filter({ has: page.getByRole('button', { name, exact: true }) });
}

export function itemCountLabel(count: number): string {
  return en.wardrobe.itemCount(count);
}

// Counts records in one on-device store. Returns 0 when the database or store does not exist.
export async function countStoredRecords(page: Page, store: 'items' | 'consent' | 'profile' | 'outfits'): Promise<number> {
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
