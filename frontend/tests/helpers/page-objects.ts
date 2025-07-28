import { Page, Locator, expect } from '@playwright/test';
import { TestClothingItem } from './test-data';

/**
 * Page Object Model for the Wardrobe App
 * Provides reusable methods for interacting with different pages
 */

export class AppNavigationPage {
  constructor(public readonly page: Page) {}

  // Navigation elements (using tabs instead of links)
  get wardrobeTab() { return this.page.getByRole('tab', { name: /wardrobe/i }); }
  get uploadTab() { return this.page.getByRole('tab', { name: /upload/i }); }
  get createOutfitTab() { return this.page.getByRole('tab', { name: /create outfit/i }); }
  get outfitsTab() { return this.page.getByRole('tab', { name: /my outfits/i }); }

  async navigateToUpload() {
    await this.uploadTab.click();
    await expect(this.page).toHaveURL('/upload');
  }

  async navigateToCreateOutfit() {
    await this.createOutfitTab.click();
    await expect(this.page).toHaveURL('/create-outfit');
  }

  async navigateToOutfits() {
    await this.outfitsTab.click();
    await expect(this.page).toHaveURL('/outfits');
  }

  async navigateToHome() {
    await this.wardrobeTab.click();
    await expect(this.page).toHaveURL('/');
  }
}

export class ClothingUploadPage {
  constructor(public readonly page: Page) {}

  // Upload area elements
  get uploadArea() { return this.page.locator('input[type="file"]'); }
  get uploadDropZone() { return this.page.locator('text=Drag & drop images here'); }
  get processingIndicator() { return this.page.locator('text=Processing images...'); }
  
  // Item management
  get pendingItemsGrid() { return this.page.locator('text=Items to Upload').locator('..').locator('div[role="grid"], div.MuiGrid-container').first(); }
  get saveAllButton() { return this.page.getByRole('button', { name: /save.*items/i }); }
  get clearAllButton() { return this.page.getByRole('button', { name: /clear all/i }); }
  
  // Success/error messages
  get successMessage() { return this.page.locator('text=Items saved successfully!'); }
  get errorMessage() { return this.page.locator('[role="alert"]').filter({ hasText: /failed|error/i }); }

  async uploadFiles(filePaths: string[]) {
    await this.uploadArea.setInputFiles(filePaths);
    
    // Wait for processing to complete
    if (await this.processingIndicator.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.processingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
    }
  }

  async uploadTestImage() {
    // Create a test image file using File API in the browser
    const fileContent = await this.page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 100, 100);
      }
      return canvas.toDataURL('image/jpeg');
    });

    // Convert data URL to blob and create file
    await this.page.evaluate((dataUrl) => {
      const byteString = atob(dataUrl.split(',')[1]);
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const file = new File([blob], 'test-image.jpg', { type: 'image/jpeg' });
      
      // Get the file input and trigger change event
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, fileContent);

    // Wait for processing
    await this.page.waitForTimeout(1000);
  }

  async editItemDetails(itemIndex: number, details: Partial<TestClothingItem>) {
    const editButton = this.pendingItemsGrid.locator('button').filter({ hasText: /edit details/i }).nth(itemIndex);
    await editButton.click();

    // Wait for dialog to open
    const dialog = this.page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible' });

    if (details.name) {
      const nameField = dialog.getByLabel('Name');
      await nameField.waitFor({ state: 'visible' });
      await nameField.fill(details.name);
    }
    
    if (details.category) {
      const categoryField = dialog.getByLabel('Category');
      await categoryField.waitFor({ state: 'visible' });
      await categoryField.click();
      await this.page.getByRole('option', { name: new RegExp(details.category, 'i') }).click();
    }
    
    if (details.color) {
      const colorField = dialog.getByLabel('Color');
      await colorField.waitFor({ state: 'visible' });
      await colorField.fill(details.color);
    }
    
    if (details.brand) {
      const brandField = dialog.getByLabel('Brand');
      await brandField.waitFor({ state: 'visible' });
      await brandField.fill(details.brand);
    }
    
    if (details.tags) {
      const tagsField = dialog.getByLabel(/tags/i);
      await tagsField.waitFor({ state: 'visible' });
      await tagsField.fill(details.tags.join(', '));
    }

    await this.page.getByRole('button', { name: 'Save' }).click();
    await dialog.waitFor({ state: 'hidden' });
  }

  async saveAllItems() {
    await this.saveAllButton.click();
    
    // Wait for either success or error message
    try {
      await this.successMessage.waitFor({ timeout: 10000 });
    } catch {
      // Check for error message
      await this.errorMessage.waitFor({ timeout: 5000 });
    }
  }

  async verifyItemUploaded(itemName: string) {
    await expect(this.pendingItemsGrid.locator('text=' + itemName)).toBeVisible();
  }
}

export class OutfitCreatorPage {
  constructor(public readonly page: Page) {}

  // Main outfit builder elements
  get addItemsButton() { return this.page.getByRole('button', { name: /add items/i }); }
  get doneSelectingButton() { return this.page.getByRole('button', { name: /done selecting/i }); }
  get clearOutfitButton() { return this.page.getByRole('button', { name: /clear/i }); }
  get saveOutfitButton() { return this.page.getByRole('button', { name: /save outfit/i }); }
  
  // Outfit display
  get currentOutfitSection() { return this.page.locator('text=Current Outfit').locator('..'); }
  get outfitItemsGrid() { return this.currentOutfitSection.locator('.MuiGrid-container').first(); }
  
  // Wardrobe selection
  get wardrobeSection() { return this.page.locator('text=Your Wardrobe').locator('..'); }
  get wardrobeItemsGrid() { return this.wardrobeSection.locator('.MuiGrid-container').first(); }
  
  // Save dialog
  get saveDialog() { return this.page.locator('[role="dialog"]'); }
  get outfitNameInput() { return this.page.getByLabel('Outfit Name'); }
  get outfitTagsInput() { return this.page.getByLabel(/tags/i); }
  get saveDialogSaveButton() { return this.saveDialog.getByRole('button', { name: 'Save Outfit' }); }
  get saveDialogCancelButton() { return this.saveDialog.getByRole('button', { name: 'Cancel' }); }
  
  // Messages
  get successMessage() { return this.page.locator('text=Outfit saved successfully!'); }
  get errorMessage() { return this.page.locator('[role="alert"]').filter({ hasText: /failed|error/i }); }

  async enterSelectionMode() {
    await this.addItemsButton.click();
    await expect(this.doneSelectingButton).toBeVisible();
  }

  async exitSelectionMode() {
    await this.doneSelectingButton.click();
    await expect(this.addItemsButton).toBeVisible();
  }

  async selectClothingItem(itemName: string) {
    const item = this.wardrobeItemsGrid.locator('text=' + itemName).locator('..');
    await item.click();
    
    // Verify item appears in current outfit
    await expect(this.outfitItemsGrid.locator('text=' + itemName)).toBeVisible();
  }

  async removeItemFromOutfit(itemName: string) {
    const outfitItem = this.outfitItemsGrid.locator('text=' + itemName).locator('..');
    const removeButton = outfitItem.locator('button[aria-label*="delete"], button').filter({ hasText: /delete/i }).first();
    await removeButton.click();
    
    // Verify item is removed
    await expect(this.outfitItemsGrid.locator('text=' + itemName)).not.toBeVisible();
  }

  async saveOutfit(name: string, tags: string[] = []) {
    await this.saveOutfitButton.click();
    
    // Wait for dialog to open
    await this.saveDialog.waitFor({ state: 'visible' });
    
    await this.outfitNameInput.fill(name);
    
    if (tags.length > 0) {
      await this.outfitTagsInput.fill(tags.join(', '));
    }
    
    await this.saveDialogSaveButton.click();
    
    // Wait for dialog to close and success message
    await this.saveDialog.waitFor({ state: 'hidden' });
    
    try {
      await this.successMessage.waitFor({ timeout: 10000 });
    } catch {
      await this.errorMessage.waitFor({ timeout: 5000 });
    }
  }

  async clearCurrentOutfit() {
    await this.clearOutfitButton.click();
    
    // Verify outfit is cleared
    await expect(this.outfitItemsGrid.locator('img')).toHaveCount(0);
  }

  async verifyOutfitContainsItems(itemNames: string[]) {
    for (const itemName of itemNames) {
      await expect(this.outfitItemsGrid.locator('text=' + itemName)).toBeVisible();
    }
  }

  async verifyOutfitIsEmpty() {
    await expect(this.page.locator('text=No items selected')).toBeVisible();
  }
}

export class OutfitsGalleryPage {
  constructor(public readonly page: Page) {}

  get outfitsGrid() { return this.page.locator('.MuiGrid-container').first(); }
  get noOutfitsMessage() { return this.page.locator('text=No outfits saved yet'); }

  async verifyOutfitExists(outfitName: string) {
    await expect(this.outfitsGrid.locator('text=' + outfitName)).toBeVisible();
  }

  async verifyNoOutfits() {
    await expect(this.noOutfitsMessage).toBeVisible();
  }
}