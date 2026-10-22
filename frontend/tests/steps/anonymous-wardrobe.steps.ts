// Step definitions for tests/features/S1-01-anonymous-wardrobe-upload.feature.
import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { en } from '../../src/strings/en';
import {
  addPhotos,
  addSamplePhotos,
  confirmAdult,
  countStoredRecords,
  expectOnlyAppRequests,
  goTo,
  itemCountLabel,
  metadataFoundIn,
  openApp,
} from '../support/app';
import {
  notAPhoto,
  oversizedJpeg,
  PhotoFormat,
  samplePhotoFile,
  withLocationAndDeviceDetails,
} from '../support/photos';

const { Given, When, Then } = createBdd();

const consentHeading = en.consent.heading;
const addPhotosButton = en.wardrobe.addPhotos;

// Age confirmation

Given('I open the app for the first time on this device', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('heading', { name: en.age.heading })).toBeVisible();
});

Then('I am asked whether I am 18 or over', async ({ page }) => {
  await expect(page.getByRole('heading', { name: en.age.heading })).toBeVisible();
});

When('I confirm that I am 18 or over', async ({ page }) => {
  await page.getByRole('button', { name: en.age.adult }).click();
});

Then('I see my wardrobe', async ({ page }) => {
  await expect(page.getByRole('heading', { name: en.wardrobe.heading })).toBeVisible();
});

Then('my wardrobe is empty', async ({ page }) => {
  await expect(page.getByText(en.wardrobe.empty)).toBeVisible();
});

Then('I can choose {string}', async ({ page }, label: string) => {
  await expect(page.getByRole('button', { name: label })).toBeVisible();
});

When('I say that I am under 18', async ({ page }) => {
  await page.getByRole('button', { name: en.age.underage }).click();
});

Then('I see a message that Slay Drip is only for adults', async ({ page }) => {
  await expect(page.getByRole('heading', { name: en.underage.heading })).toBeVisible();
});

Then('I cannot reach my wardrobe', async ({ page }) => {
  await expect(page.getByRole('heading', { name: en.wardrobe.heading })).toHaveCount(0);
  await expect(page.getByRole('button', { name: addPhotosButton })).toHaveCount(0);
});

Then('nothing is stored on this device', async ({ page }) => {
  expect(await countStoredRecords(page, 'profile')).toBe(0);
  expect(await countStoredRecords(page, 'consent')).toBe(0);
  expect(await countStoredRecords(page, 'items')).toBe(0);
});

// Consent

Given('I have confirmed that I am 18 or over', async ({ page }) => {
  await confirmAdult(page);
  await expect(page.getByRole('heading', { name: en.wardrobe.heading })).toBeVisible();
});

When('I choose {string}', async ({ page }, label: string) => {
  await page.getByRole('button', { name: label }).click();
});

Then('I am asked whether to store photos of my clothes on this device', async ({ page }) => {
  await expect(page.getByRole('heading', { name: consentHeading })).toBeVisible();
});

Then('no photo is stored yet', async ({ page }) => {
  expect(await countStoredRecords(page, 'items')).toBe(0);
});

Given(
  'I have been asked whether to store photos of my clothes on this device',
  async ({ page }) => {
    await page.getByRole('button', { name: addPhotosButton }).click();
    await expect(page.getByRole('heading', { name: consentHeading })).toBeVisible();
  },
);

When('I decline to store photos', async ({ page }) => {
  await page.getByRole('button', { name: en.consent.no }).click();
});

Given('I have agreed to store photos of my clothes on this device', async ({ page }) => {
  // The file picker opens from this click. Nothing listens for it here, so no file is chosen.
  await page.getByRole('button', { name: addPhotosButton }).click();
  await page.getByRole('button', { name: en.consent.yes }).click();
  await expect.poll(() => countStoredRecords(page, 'consent')).toBe(1);
});

Given('I have added {int} photo(s) to my wardrobe', async ({ page }, count: number) => {
  await addSamplePhotos(page, count);
  await expect(page.getByText(itemCountLabel(count), { exact: true })).toBeVisible();
});

When('I withdraw consent and delete my photos', async ({ page }) => {
  await goTo(page, 'wardrobe');
  await page.getByRole('button', { name: en.wardrobe.withdraw }).click();
});

// Matches the withdrawal, item and outfit confirmations. Only one is open at a time.
When('I confirm the deletion', async ({ page }) => {
  await page.getByRole('button', { name: /^Yes, delete/ }).click();
});

Then('adding a photo asks for consent again', async ({ page }) => {
  await page.getByRole('button', { name: addPhotosButton }).click();
  await expect(page.getByRole('heading', { name: consentHeading })).toBeVisible();
});

// Upload

When('I add a {word} photo of a clothing item', async ({ page }, format: string) => {
  await addSamplePhotos(page, 1, format as PhotoFormat);
});

When('I add a photo of a clothing item', async ({ page }) => {
  await addSamplePhotos(page, 1);
});

When('I add {int} photos of clothing items at once', async ({ page }, count: number) => {
  await addSamplePhotos(page, count);
});

When(
  'I add a file named {string} that is not a JPEG, PNG or WebP image',
  async ({ page }, name: string) => {
    await addPhotos(page, [{ name, mimeType: 'image/jpeg', buffer: notAPhoto() }]);
  },
);

When('I add a JPEG photo that is larger than 10 MB', async ({ page }) => {
  await addPhotos(page, [{ name: 'large.jpg', mimeType: 'image/jpeg', buffer: oversizedJpeg() }]);
});

When('I add a JPEG photo that contains location and device details', async ({ page }) => {
  const jpeg = await samplePhotoFile(page, 'JPEG', 0);
  const withDetails = withLocationAndDeviceDetails(jpeg.buffer);
  // Check the test input really carries the metadata, so the scenario proves something.
  expect(withDetails.includes(Buffer.from('TestCamera'))).toBe(true);
  await addPhotos(page, [{ name: 'details.jpg', mimeType: 'image/jpeg', buffer: withDetails }]);
});

Then('the photo appears in my wardrobe', async ({ page }) => {
  await expect(page.getByRole('img', { name: en.wardrobe.itemAlt(1) })).toBeVisible();
});

Then('my wardrobe shows {int} item(s)', async ({ page }, count: number) => {
  await goTo(page, 'wardrobe');
  await expect(page.getByText(itemCountLabel(count), { exact: true })).toBeVisible();
});

Then('I see an error that the file is not a supported photo', async ({ page }) => {
  await expect(page.getByRole('alert')).toContainText(en.upload.unsupported);
});

Then('I see an error that the photo is too large', async ({ page }) => {
  await expect(page.getByRole('alert')).toContainText(en.upload.tooLarge);
});

Then('the stored photo contains no location or device details', async ({ page }) => {
  await expect(page.getByRole('img', { name: en.wardrobe.itemAlt(1) })).toBeVisible();
  const found = await metadataFoundIn(page, 1);
  expect(found).toEqual({
    exifHeader: false,
    deviceMake: false,
    gpsCoordinates: false,
    app1Segment: false,
  });
});

Then('no request leaves the app carrying photo data', ({ page }) => {
  expectOnlyAppRequests(page);
});

// Viewing

When('I open my wardrobe', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: en.wardrobe.heading })).toBeVisible();
});

When('I reload the app', async ({ page }) => {
  await page.reload();
});

// Makes reads of the consent and items stores fail, as they would if the browser blocked on-device storage.
// Writes and the age check are left alone, so the wardrobe can still be opened.
Given('on-device storage cannot read my wardrobe', async ({ page }) => {
  await page.evaluate(() => {
    const blockedStores = ['consent', 'items'];
    const proto = IDBObjectStore.prototype;
    const original = (name: 'get' | 'getAll') =>
      Object.getOwnPropertyDescriptor(proto, name)?.value as IDBObjectStore['get'];
    const realGet = original('get');
    const realGetAll = original('getAll') as IDBObjectStore['getAll'];
    proto.get = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['get']>) {
      if (blockedStores.includes(this.name)) {
        throw new DOMException('On-device storage is blocked', 'SecurityError');
      }
      return realGet.apply(this, args);
    };
    proto.getAll = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['getAll']>) {
      if (blockedStores.includes(this.name)) {
        throw new DOMException('On-device storage is blocked', 'SecurityError');
      }
      return realGetAll.apply(this, args);
    };
  });
});

When('I go back to my wardrobe', async ({ page }) => {
  // Moves in-app, so the blocked reads are still in place when the wardrobe mounts again.
  await goTo(page, 'wardrobe');
});

Then('I see an error that my wardrobe could not be loaded', async ({ page }) => {
  await expect(page.getByRole('alert')).toContainText(en.wardrobe.loadFailed);
});

Then('I cannot add photos or create an outfit', async ({ page }) => {
  await expect(page.getByRole('button', { name: addPhotosButton })).toBeDisabled();
  await expect(page.getByRole('button', { name: en.outfits.create })).toBeDisabled();
});

Then('I see {int} photos of clothing items in a grid', async ({ page }, count: number) => {
  await expect(page.getByRole('img', { name: /^Wardrobe item \d+$/ })).toHaveCount(count);
});

Then(
  'each photo has the name {string} followed by its number',
  async ({ page }, prefix: string) => {
    const photos = page.getByRole('img', { name: new RegExp(`^${prefix} \\d+$`) });
    const count = await photos.count();
    expect(count).toBeGreaterThan(0);
    for (let position = 1; position <= count; position++) {
      await expect(
        page.getByRole('img', { name: `${prefix} ${position}`, exact: true }),
      ).toBeVisible();
    }
  },
);

When('I move through the wardrobe using only the Tab key', async ({ page }) => {
  const addButton = page.getByRole('button', { name: addPhotosButton });
  for (let press = 0; press < 15; press++) {
    if (await addButton.evaluate((element) => element === document.activeElement)) {
      break;
    }
    await page.keyboard.press('Tab');
  }
});

Then('I can reach {string} and activate it with the Enter key', async ({ page }, label: string) => {
  const button = page.getByRole('button', { name: label });
  await expect(button).toBeFocused();
  const chooserEvent = page.waitForEvent('filechooser');
  await page.keyboard.press('Enter');
  await chooserEvent;
});

Then('it has no accessibility violations against WCAG 2.1 AA', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
