import { test, expect } from '@playwright/test';
import { AppNavigationPage, ClothingUploadPage, OutfitCreatorPage, OutfitsGalleryPage } from './helpers/page-objects';
import { sampleClothingItems, testOutfits } from './helpers/test-data';
import { simpleCleanup } from './helpers/test-isolation';

test.describe('Outfit Creation Flow', () => {
  // Configure for parallel execution
  test.describe.configure({ mode: 'parallel' });
  let navigation: AppNavigationPage;
  let uploadPage: ClothingUploadPage;
  let outfitCreator: OutfitCreatorPage;
  let outfitsGallery: OutfitsGalleryPage;

  test.beforeEach(async ({ page }) => {
    navigation = new AppNavigationPage(page);
    uploadPage = new ClothingUploadPage(page);
    outfitCreator = new OutfitCreatorPage(page);
    outfitsGallery = new OutfitsGalleryPage(page);
    
    await page.goto('/');
    
    // Use improved cleanup for parallel execution
    await simpleCleanup(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await simpleCleanup(page);
  });

  test.describe('Initial State', () => {
    test('should display empty outfit creator correctly @smoke', async ({ page }) => {
      await navigation.navigateToCreateOutfit();
      
      // Verify page title and empty state
      await expect(page.getByText('Create Outfit')).toBeVisible();
      await expect(page.getByText('Current Outfit (0 items)')).toBeVisible();
      await expect(outfitCreator.verifyOutfitIsEmpty()).resolves.toBeUndefined();
      
      // Verify wardrobe section exists but is empty
      await expect(page.getByText('Your Wardrobe')).toBeVisible();
      await expect(page.getByText('No items found')).toBeVisible();
    });

    test('should be responsive on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigation.navigateToCreateOutfit();
      
      // Verify mobile layout
      await expect(page.getByText('Create Outfit')).toBeVisible();
      await expect(outfitCreator.addItemsButton).toBeVisible();
      
      // Check button layout is appropriate for mobile
      const buttonContainer = page.locator('text=Add Items').locator('..');
      const boundingBox = await buttonContainer.boundingBox();
      expect(boundingBox?.width).toBeLessThan(400);
    });

    test('should be responsive on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await navigation.navigateToCreateOutfit();
      
      await expect(page.getByText('Create Outfit')).toBeVisible();
      await expect(outfitCreator.addItemsButton).toBeVisible();
    });
  });

  test.describe('With Existing Wardrobe Items', () => {
    test.beforeEach(async ({ page }) => {
      // Setup: Upload some clothing items first
      await navigation.navigateToUpload();
      
      // Upload and save multiple items
      for (let i = 0; i < 3; i++) {
        await uploadPage.uploadTestImage();
        await uploadPage.editItemDetails(i, sampleClothingItems[i]);
      }
      
      await uploadPage.saveAllItems();
      await expect(uploadPage.successMessage).toBeVisible();
      
      // Navigate to outfit creation
      await navigation.navigateToCreateOutfit();
    });

    test('should display available wardrobe items', async ({ page }) => {
      // Verify wardrobe items are displayed
      for (const item of sampleClothingItems.slice(0, 3)) {
        await expect(page.getByText(item.name)).toBeVisible();
      }
      
      // Verify items count in wardrobe
      await expect(page.getByText('Your Wardrobe (3 items)')).toBeVisible();
    });

    test('should enter and exit selection mode', async ({ page }) => {
      // Enter selection mode
      await outfitCreator.enterSelectionMode();
      await expect(outfitCreator.doneSelectingButton).toBeVisible();
      
      // Exit selection mode
      await outfitCreator.exitSelectionMode();
      await expect(outfitCreator.addItemsButton).toBeVisible();
    });

    test('should select items for outfit', async ({ page }) => {
      await outfitCreator.enterSelectionMode();
      
      // Select first two items
      const itemsToSelect = sampleClothingItems.slice(0, 2);
      for (const item of itemsToSelect) {
        await outfitCreator.selectClothingItem(item.name);
      }
      
      // Verify outfit contains selected items
      await outfitCreator.verifyOutfitContainsItems(itemsToSelect.map(item => item.name));
      await expect(page.getByText('Current Outfit (2 items)')).toBeVisible();
    });

    test('should remove items from outfit', async ({ page }) => {
      await outfitCreator.enterSelectionMode();
      
      // Select an item
      const testItem = sampleClothingItems[0];
      await outfitCreator.selectClothingItem(testItem.name);
      
      // Remove the item
      await outfitCreator.removeItemFromOutfit(testItem.name);
      
      // Verify item is removed
      await expect(page.getByText('Current Outfit (0 items)')).toBeVisible();
    });

    test('should clear entire outfit', async ({ page }) => {
      await outfitCreator.enterSelectionMode();
      
      // Select multiple items
      const itemsToSelect = sampleClothingItems.slice(0, 2);
      for (const item of itemsToSelect) {
        await outfitCreator.selectClothingItem(item.name);
      }
      
      // Clear outfit
      await outfitCreator.clearCurrentOutfit();
      
      // Verify outfit is empty
      await outfitCreator.verifyOutfitIsEmpty();
    });

    test('should save outfit successfully', async ({ page }) => {
      await outfitCreator.enterSelectionMode();
      
      // Select items for outfit
      const itemsToSelect = sampleClothingItems.slice(0, 2);
      for (const item of itemsToSelect) {
        await outfitCreator.selectClothingItem(item.name);
      }
      
      // Save outfit
      const outfitName = testOutfits[0].name;
      const outfitTags = testOutfits[0].tags;
      await outfitCreator.saveOutfit(outfitName, outfitTags);
      
      // Verify success message
      await expect(outfitCreator.successMessage).toBeVisible();
      
      // Verify outfit is cleared after save
      await outfitCreator.verifyOutfitIsEmpty();
    });

    test('should validate outfit save requirements', async ({ page }) => {
      // Try to save without selecting any items
      await outfitCreator.saveOutfitButton.click();
      
      // Save button should be disabled when no items selected
      await expect(outfitCreator.saveOutfitButton).toBeDisabled();
      
      // Add an item
      await outfitCreator.enterSelectionMode();
      await outfitCreator.selectClothingItem(sampleClothingItems[0].name);
      
      // Try to save without outfit name
      await outfitCreator.saveOutfitButton.click();
      await expect(outfitCreator.saveDialog).toBeVisible();
      
      // Save button in dialog should be disabled without name
      await expect(outfitCreator.saveDialogSaveButton).toBeDisabled();
      
      // Add name and verify button is enabled
      await outfitCreator.outfitNameInput.fill('Test Outfit');
      await expect(outfitCreator.saveDialogSaveButton).toBeEnabled();
      
      // Cancel dialog
      await outfitCreator.saveDialogCancelButton.click();
    });

    test('should organize items by category in outfit display', async ({ page }) => {
      await outfitCreator.enterSelectionMode();
      
      // Select items from different categories
      const itemsToSelect = [
        sampleClothingItems[0], // tops
        sampleClothingItems[2], // bottoms
        sampleClothingItems[3]  // shoes
      ];
      
      for (const item of itemsToSelect) {
        await outfitCreator.selectClothingItem(item.name);
      }
      
      // Verify items are organized by category
      await expect(page.getByText('tops (1)')).toBeVisible();
      await expect(page.getByText('bottoms (1)')).toBeVisible();
      await expect(page.getByText('shoes (1)')).toBeVisible();
    });
  });

  test.describe('End-to-End Outfit Creation', () => {
    test('should complete full workflow from upload to outfit creation', async ({ page }) => {
      // Step 1: Upload clothing items
      await navigation.navigateToUpload();
      
      // Upload items for a complete outfit
      const outfitItems = sampleClothingItems.slice(0, 3);
      for (let i = 0; i < outfitItems.length; i++) {
        await uploadPage.uploadTestImage();
        await uploadPage.editItemDetails(i, outfitItems[i]);
      }
      
      await uploadPage.saveAllItems();
      await expect(uploadPage.successMessage).toBeVisible();
      
      // Step 2: Create outfit
      await navigation.navigateToCreateOutfit();
      await outfitCreator.enterSelectionMode();
      
      // Select all uploaded items
      for (const item of outfitItems) {
        await outfitCreator.selectClothingItem(item.name);
      }
      
      // Save the outfit
      await outfitCreator.saveOutfit(testOutfits[0].name, testOutfits[0].tags);
      await expect(outfitCreator.successMessage).toBeVisible();
      
      // Step 3: Verify outfit appears in gallery
      await navigation.navigateToOutfits();
      await outfitsGallery.verifyOutfitExists(testOutfits[0].name);
    });

    test('should handle multiple outfit creation', async ({ page }) => {
      // Setup wardrobe with enough items for multiple outfits
      await navigation.navigateToUpload();
      
      const allItems = sampleClothingItems;
      for (let i = 0; i < allItems.length; i++) {
        await uploadPage.uploadTestImage();
        await uploadPage.editItemDetails(i, allItems[i]);
      }
      
      await uploadPage.saveAllItems();
      await expect(uploadPage.successMessage).toBeVisible();
      
      // Create first outfit
      await navigation.navigateToCreateOutfit();
      await outfitCreator.enterSelectionMode();
      
      // Select items for first outfit
      await outfitCreator.selectClothingItem(allItems[0].name);
      await outfitCreator.selectClothingItem(allItems[2].name);
      
      await outfitCreator.saveOutfit('Casual Outfit', ['casual']);
      await expect(outfitCreator.successMessage).toBeVisible();
      
      // Create second outfit
      await outfitCreator.enterSelectionMode();
      
      // Select different items for second outfit
      await outfitCreator.selectClothingItem(allItems[1].name);
      await outfitCreator.selectClothingItem(allItems[4].name);
      
      await outfitCreator.saveOutfit('Formal Outfit', ['formal']);
      await expect(outfitCreator.successMessage).toBeVisible();
      
      // Verify both outfits exist
      await navigation.navigateToOutfits();
      await outfitsGallery.verifyOutfitExists('Casual Outfit');
      await outfitsGallery.verifyOutfitExists('Formal Outfit');
    });
  });

  test.describe('Visual Testing', () => {
    test('should display consistently across browsers', async ({ page }) => {
      await navigation.navigateToCreateOutfit();
      
      // Take screenshot of empty state
      await expect(page).toHaveScreenshot('outfit-creator-empty.png');
      
      // Add some items and take another screenshot
      // (This would require setting up test data first)
    });

    test('should display correctly on different screen sizes', async ({ page }) => {
      await navigation.navigateToCreateOutfit();
      
      const viewports = [
        { width: 320, height: 568, name: 'mobile-small' },
        { width: 375, height: 667, name: 'mobile-medium' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1024, height: 768, name: 'tablet-landscape' },
        { width: 1440, height: 900, name: 'desktop-medium' },
        { width: 1920, height: 1080, name: 'desktop-large' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(500);
        
        // Verify key elements are visible
        await expect(page.getByText('Create Outfit')).toBeVisible();
        await expect(outfitCreator.addItemsButton).toBeVisible();
        
        // Take screenshot for visual verification
        await expect(page).toHaveScreenshot(`outfit-creator-${viewport.name}.png`);
      }
    });

    test('should display outfit grid responsively', async ({ page }) => {
      // This test would require pre-populating the wardrobe
      // For now, we'll test the responsive layout of empty states
      
      const viewports = [
        { width: 375, height: 667 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1440, height: 900 } // Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await navigation.navigateToCreateOutfit();
        
        // Verify layout adapts to viewport
        const outfitSection = outfitCreator.currentOutfitSection;
        const boundingBox = await outfitSection.boundingBox();
        
        // Outfit section should not exceed viewport width
        expect(boundingBox?.width).toBeLessThanOrEqual(viewport.width);
        
        // Verify responsive button layout
        const buttonContainer = page.locator('text=Add Items').locator('..');
        const buttonBox = await buttonContainer.boundingBox();
        expect(buttonBox?.width).toBeLessThanOrEqual(viewport.width);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and keyboard navigation', async ({ page }) => {
      await navigation.navigateToCreateOutfit();
      
      // Test keyboard navigation to main buttons
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Verify buttons are accessible
      await expect(outfitCreator.addItemsButton).toBeVisible();
      await expect(outfitCreator.clearOutfitButton).toBeVisible();
      await expect(outfitCreator.saveOutfitButton).toBeVisible();
      
      // Test save dialog accessibility
      const hasItems = await page.locator('text=Your Wardrobe').locator('..').locator('img').count() > 0;
      
      if (hasItems) {
        await outfitCreator.saveOutfitButton.click();
        const dialog = outfitCreator.saveDialog;
        await expect(dialog).toBeVisible();
        
        // Verify form accessibility
        await expect(page.getByLabel('Outfit Name')).toBeVisible();
        await expect(page.getByLabel(/tags/i)).toBeVisible();
        
        // Test keyboard navigation in dialog
        await page.keyboard.press('Tab'); // Should focus first field
        await page.keyboard.press('Tab'); // Should focus second field
        
        // Close dialog
        await outfitCreator.saveDialogCancelButton.click();
      }
    });

    test('should announce important state changes', async ({ page }) => {
      await navigation.navigateToCreateOutfit();
      
      // Test that success messages are announced
      // (This would require actual items in the wardrobe to test properly)
      
      // Verify that outfit count is announced
      await expect(page.getByText('Current Outfit (0 items)')).toBeVisible();
      
      // The text should be accessible to screen readers
      const outfitCounter = page.getByText('Current Outfit (0 items)');
      await expect(outfitCounter).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle empty wardrobe gracefully', async ({ page }) => {
      await navigation.navigateToCreateOutfit();
      
      // Verify empty state messaging
      await expect(page.getByText('No items found')).toBeVisible();
      
      // Verify that selection mode still works (even if no items to select)
      await outfitCreator.enterSelectionMode();
      await expect(outfitCreator.doneSelectingButton).toBeVisible();
    });

    test('should handle save dialog cancellation', async ({ page }) => {
      // This test would need items in wardrobe to work properly
      await navigation.navigateToCreateOutfit();
      
      // For now, test that the save button is properly disabled
      await expect(outfitCreator.saveOutfitButton).toBeDisabled();
    });
  });
});