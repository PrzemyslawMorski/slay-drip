// Step definitions for tests/features/signed-in-wardrobe.feature.
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { en } from '../../src/strings/en';
import { accountStub, seedAccountPhotos } from '../support/account-stub';
import { addPhotos, addSamplePhotos, confirmAdult, itemCountLabel } from '../support/app';
import { samplePhotoFile } from '../support/photos';

const { Given, When, Then } = createBdd();

const accountConsentHeading = en.consent.accountHeading;

// Sign-in and registration

Given('I am signed in with my account', async ({ page }) => {
  await accountStub(page);
  await confirmAdult(page);
  await page.getByRole('button', { name: en.auth.signIn }).click();
  await expect(page.getByRole('button', { name: en.auth.signOut })).toBeVisible();
  await expect(page.getByRole('heading', { name: en.wardrobe.heading })).toBeVisible();
});

Then('the registration page was used', async ({ page }) => {
  expect((await accountStub(page)).flows).toContain('register');
});

Then('I am signed in after a PKCE S256 code exchange', async ({ page }) => {
  await expect(page.getByRole('button', { name: en.auth.signOut })).toBeVisible();
  const stub = await accountStub(page);
  expect(stub.challengeMethod).toBe('S256');
  expect(stub.pkceVerified).toBe(true);
});

Then('{string} is not offered', async ({ page }, label: string) => {
  await expect(page.getByRole('button', { name: label })).toHaveCount(0);
});

Then('{string} is offered', async ({ page }, label: string) => {
  await expect(page.getByRole('button', { name: label })).toBeVisible();
});

When('I sign out', async ({ page }) => {
  await page.getByRole('button', { name: en.auth.signOut }).click();
});

// Consent

Then('I am asked whether to store photos on my account', async ({ page }) => {
  await expect(page.getByRole('heading', { name: accountConsentHeading })).toBeVisible();
});

When('I agree to store photos on my account', async ({ page }) => {
  await page.getByRole('button', { name: en.consent.yes }).click();
});

Given('I have agreed to store photos on my account', async ({ page }) => {
  // The file picker opens from this click. Nothing listens for it here, so no file is chosen.
  await page.getByRole('button', { name: en.wardrobe.addPhotos }).click();
  await expect(page.getByRole('heading', { name: accountConsentHeading })).toBeVisible();
  await page.getByRole('button', { name: en.consent.yes }).click();
  await expect.poll(async () => (await accountStub(page)).consentGranted).toBe(true);
});

Then('the server has recorded my consent to store photos', async ({ page }) => {
  const stub = await accountStub(page);
  expect(stub.consentGranted).toBe(true);
  expect(stub.apiRequests.some((request) => request.method === 'PUT')).toBe(true);
});

Then('the server has recorded that my consent was withdrawn', async ({ page }) => {
  const stub = await accountStub(page);
  expect(stub.consentGranted).toBe(false);
  expect(stub.photos).toHaveLength(0);
});

// Photos

Given('my account already has {int} photo(s)', async ({ page }, count: number) => {
  await seedAccountPhotos(page, count);
});

Given('I have added {int} photos to my account', async ({ page }, count: number) => {
  await addSamplePhotos(page, count);
  await expect(page.getByText(itemCountLabel(count), { exact: true })).toBeVisible();
});

When('I add one JPEG photo of a clothing item to my account', async ({ page }) => {
  await addPhotos(page, [await samplePhotoFile(page, 'JPEG', 0)]);
});

Then('the photo is sent to the server with my access token', async ({ page }) => {
  const stub = await accountStub(page);
  // The upload starts after the file is chosen, so wait for it before reading what was sent.
  await expect.poll(() => stub.photos.length).toBe(1);
  const upload = stub.apiRequests.find(
    (request) => request.method === 'POST' && request.path === '/wardrobe/items',
  );
  expect(upload?.authorization).toBe(`Bearer ${stub.accessToken}`);
});

Then('each photo is loaded from the server with my access token', async ({ page }) => {
  const stub = await accountStub(page);
  const photoRequests = stub.apiRequests.filter((request) => /\/photo$/.test(request.path));
  expect(photoRequests.length).toBeGreaterThan(0);
  for (const request of photoRequests) {
    expect(request.authorization).toBe(`Bearer ${stub.accessToken}`);
  }
});

// Anonymous use

Given('the account service is watched', async ({ page }) => {
  await accountStub(page);
});

Then('the account service has received no requests', async ({ page }) => {
  const stub = await accountStub(page);
  expect(stub.apiRequests).toHaveLength(0);
  expect(stub.flows).toHaveLength(0);
});
