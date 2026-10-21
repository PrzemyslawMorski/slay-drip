// Step definitions for tests/features/S1-02-manual-outfit-creation.feature.
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { en } from '../../src/strings/en';
import {
  addSamplePhotos,
  countStoredRecords,
  expectOnlyAppRequests,
  goTo,
  outfitCard,
  saveOutfitThroughUi,
} from '../support/app';

const { Given, When, Then } = createBdd();

const wardrobeItemButtons = /^Wardrobe item \d+$/;

function previewList(page: Parameters<typeof goTo>[0]) {
  return page.getByRole('list', { name: en.builder.previewHeading });
}

// Outfits

Given('I have no saved outfits', async ({ page }) => {
  expect(await countStoredRecords(page, 'outfits')).toBe(0);
});

Given(
  'I have saved an outfit named {string} with {int} wardrobe items',
  async ({ page }, name: string, count: number) => {
    const itemNames = Array.from({ length: count }, (_, index) => en.wardrobe.itemAlt(index + 1));
    await saveOutfitThroughUi(page, name, itemNames);
  },
);

Given(
  'I have saved an outfit named {string} with {string} and {string}',
  async ({ page }, name: string, first: string, second: string) => {
    await saveOutfitThroughUi(page, name, [first, second]);
  },
);

Given(
  'I have saved an outfit named {string} with only {string}',
  async ({ page }, name: string, item: string) => {
    await saveOutfitThroughUi(page, name, [item]);
  },
);

When('I create and save an outfit with those {int} items', async ({ page }, count: number) => {
  const itemNames = Array.from({ length: count }, (_, index) => en.wardrobe.itemAlt(index + 1));
  await saveOutfitThroughUi(page, '', itemNames);
});

When('I try to open my outfits', async ({ page }) => {
  await expect(page.getByRole('button', { name: en.nav.outfits })).toHaveCount(0);
});

When('I open my outfits', async ({ page }) => {
  await goTo(page, 'outfits');
});

When('I go to my wardrobe', async ({ page }) => {
  await goTo(page, 'wardrobe');
});

Then('I cannot create an outfit', async ({ page }) => {
  await expect(page.getByRole('button', { name: en.outfits.create })).toHaveCount(0);
});

Then('I see {string} in my outfits', async ({ page }, name: string) => {
  await goTo(page, 'outfits');
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
});

Then('{string} lists its {int} items', async ({ page }, name: string, count: number) => {
  await goTo(page, 'outfits');
  await expect(outfitCard(page, name).getByRole('listitem')).toHaveCount(count);
});

Then(
  '{string} lists {string} and {string}',
  async ({ page }, name: string, first: string, second: string) => {
    await goTo(page, 'outfits');
    await expect(outfitCard(page, name)).toContainText(first);
    await expect(outfitCard(page, name)).toContainText(second);
  },
);

Then('{string} does not list {string}', async ({ page }, name: string, item: string) => {
  await goTo(page, 'outfits');
  await expect(outfitCard(page, name)).not.toContainText(item);
});

Then('{string} lists only {string}', async ({ page }, name: string, item: string) => {
  await goTo(page, 'outfits');
  const items = outfitCard(page, name).getByRole('listitem');
  await expect(items).toHaveCount(1);
  await expect(items).toHaveText(item);
});

Then('{string} still lists the same {int} items', async ({ page }, name: string, count: number) => {
  await goTo(page, 'outfits');
  await expect(outfitCard(page, name).getByRole('listitem')).toHaveCount(count);
});

Then('{string} is no longer in my outfits', async ({ page }, name: string) => {
  await goTo(page, 'outfits');
  await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
});

Then('my outfits list is empty', async ({ page }) => {
  await goTo(page, 'outfits');
  await expect(page.getByText(en.outfits.empty)).toBeVisible();
  expect(await countStoredRecords(page, 'outfits')).toBe(0);
});

Then('no outfit is saved', async ({ page }) => {
  expect(await countStoredRecords(page, 'outfits')).toBe(0);
});

When('I open {string}', async ({ page }, name: string) => {
  await goTo(page, 'outfits');
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: en.builder.editHeading })).toBeVisible();
});

When('I delete {string}', async ({ page }, name: string) => {
  await goTo(page, 'outfits');
  await page.getByRole('button', { name: en.outfits.deleteLabel(name), exact: true }).click();
});

When('I delete {string} from my wardrobe', async ({ page }, name: string) => {
  await goTo(page, 'wardrobe');
  await page.getByRole('button', { name: `Delete ${name}`, exact: true }).click();
});

Then(
  'I see a message that {string} was deleted because none of its items are left',
  async ({ page }, name: string) => {
    await expect(page.getByRole('status')).toContainText(en.wardrobe.outfitDeleted(name));
  },
);

When(
  'I enter the name {string} and choose {string}',
  async ({ page }, name: string, label: string) => {
    await page.getByLabel(en.builder.nameLabel).fill(name);
    await page.getByRole('button', { name: label, exact: true }).click();
  },
);

When(
  'I enter a name of {int} characters and choose {string}',
  async ({ page }, count: number, label: string) => {
    await page.getByLabel(en.builder.nameLabel).fill('a'.repeat(count));
    await page.getByRole('button', { name: label, exact: true }).click();
  },
);

// "Save outfit" is marked aria-disabled while nothing is selected. It still responds, with an error, so the click is forced past Playwright's enabled check.
When('I try to choose {string}', async ({ page }, label: string) => {
  await page.getByRole('button', { name: label, exact: true }).click({ force: true });
});

When('I choose {string} without entering a name', async ({ page }, label: string) => {
  await page.getByRole('button', { name: label, exact: true }).click();
});

Then('I see an error that the name must be 60 characters or fewer', async ({ page }) => {
  await expect(page.getByRole('alert')).toContainText(en.builder.nameTooLong);
});

Then('I see an error that an outfit needs at least one item', async ({ page }) => {
  await expect(page.getByRole('alert')).toContainText(en.builder.needItem);
});

Then('no request leaves the app carrying outfit or photo data', ({ page }) => {
  expectOnlyAppRequests(page);
});

// Choosing items in the builder

Then('I see the {int} wardrobe items to choose from', async ({ page }, count: number) => {
  await expect(page.getByRole('button', { name: wardrobeItemButtons })).toHaveCount(count);
});

Then('no item is selected', async ({ page }) => {
  const buttons = page.getByRole('button', { name: wardrobeItemButtons });
  await expect(buttons.first()).toBeVisible();
  expect(
    await buttons.evaluateAll((elements) =>
      elements.every((element) => element.getAttribute('aria-pressed') === 'false'),
    ),
  ).toBe(true);
});

Then('I cannot save the outfit yet', async ({ page }) => {
  await expect(page.getByRole('button', { name: en.builder.save })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(await countStoredRecords(page, 'outfits')).toBe(0);
});

Then(
  'I see a message that I need to add photos before I can create an outfit',
  async ({ page }) => {
    await expect(page.getByRole('alert')).toContainText(en.outfits.needPhotos);
  },
);

Then('no outfit is started', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: en.builder.newHeading })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: en.wardrobe.heading })).toBeVisible();
});

When('I select {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name, exact: true }).click();
});

When('I select {string} and then {string}', async ({ page }, first: string, second: string) => {
  await page.getByRole('button', { name: first, exact: true }).click();
  await page.getByRole('button', { name: second, exact: true }).click();
});

When('I select {string} again', async ({ page }, name: string) => {
  await page.getByRole('button', { name, exact: true }).click();
});

Given('I have selected {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name, exact: true }).click();
});

When('I deselect {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name, exact: true }).click();
});

When(
  'I move to {string} with the Tab key and press the Space key',
  async ({ page }, name: string) => {
    const target = page.getByRole('button', { name, exact: true });
    for (let press = 0; press < 15; press++) {
      if (await target.evaluate((element) => element === document.activeElement)) {
        break;
      }
      await page.keyboard.press('Tab');
    }
    await expect(target).toBeFocused();
    await page.keyboard.press('Space');
  },
);

Then('{string} is selected', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

Then('{string} is not selected', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

Then('its selected state is available to screen readers', async ({ page }) => {
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-pressed'))).toBe(
    'true',
  );
});

Then(
  'the outfit preview shows {string} followed by {string}',
  async ({ page }, first: string, second: string) => {
    await expect(previewList(page).getByRole('listitem')).toHaveText([first, second]);
  },
);

Then('the outfit preview does not show {string}', async ({ page }, name: string) => {
  await expect(previewList(page)).not.toContainText(name);
});

Then('{string} is not in the outfit preview', async ({ page }, name: string) => {
  await expect(previewList(page)).not.toContainText(name);
});

// Photos added after an outfit exists

When('I add {int} more photo(s) to my wardrobe', async ({ page }, count: number) => {
  // Seeds 100 and up give the extra photos colours that differ from the earlier ones.
  await addSamplePhotos(page, count, 'JPEG', 100);
});
