import { test, expect } from '@playwright/test';
import { AppNavigationPage, ClothingUploadPage, OutfitCreatorPage, OutfitsGalleryPage } from './helpers/page-objects';
import { sampleClothingItems, testOutfits } from './helpers/test-data';
import { simpleCleanup } from './helpers/test-isolation';

test.describe('Complete Wardrobe App Workflow', () => {
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
    
    // Clear any existing data
    try {
      await page.evaluate(() => {
        localStorage.clear();
        indexedDB.deleteDatabase('wardrobeState');
      });
    } catch (error) {
      console.log('LocalStorage clearing failed, continuing with test:', error);
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    try {
      await page.evaluate(() => {
        localStorage.clear();
        indexedDB.deleteDatabase('wardrobeState');
      });
    } catch (error) {
      console.log('LocalStorage cleanup failed:', error);
    }
  });

  test.describe('Full User Journey', () => {
    test('should complete the entire wardrobe management workflow', async ({ page }) => {
      // === PHASE 1: Initial App State ===
      
      // Verify home page
      await expect(page.getByText('✨ Slay Drip')).toBeVisible();
      
      // Navigate to upload page when wardrobe is empty
      await navigation.navigateToUpload();
      await expect(page.getByText('Upload Clothing Items')).toBeVisible();
      
      // === PHASE 2: Upload Multiple Clothing Items ===
      
      const itemsToUpload = sampleClothingItems.slice(0, 4); // Upload 4 different items
      
      for (let i = 0; i < itemsToUpload.length; i++) {
        // Upload image
        await uploadPage.uploadTestImage();
        
        // Edit details for each item
        await uploadPage.editItemDetails(i, itemsToUpload[i]);
        
        // Verify item appears with correct details
        await expect(page.getByText(itemsToUpload[i].name)).toBeVisible();
        await expect(page.getByText(itemsToUpload[i].category)).toBeVisible();
      }
      
      // Verify all items are ready for upload
      await expect(page.getByText(`Items to Upload (${itemsToUpload.length})`)).toBeVisible();
      
      // Save all items
      await uploadPage.saveAllItems();
      await expect(uploadPage.successMessage).toBeVisible();
      
      // === PHASE 3: Create First Outfit ===
      
      await navigation.navigateToCreateOutfit();
      
      // Verify wardrobe contains uploaded items
      for (const item of itemsToUpload) {
        await expect(page.getByText(item.name)).toBeVisible();
      }
      
      await expect(page.getByText(`Your Wardrobe (${itemsToUpload.length} items)`)).toBeVisible();
      
      // Create first outfit: Casual weekend look
      await outfitCreator.enterSelectionMode();
      
      // Select items for casual outfit (top, bottom, shoes)
      const casualOutfitItems = [
        itemsToUpload.find(item => item.category === 'tops')!,
        itemsToUpload.find(item => item.category === 'bottoms')!,
        itemsToUpload.find(item => item.category === 'shoes')!
      ];
      
      for (const item of casualOutfitItems) {
        await outfitCreator.selectClothingItem(item.name);
      }
      
      // Verify outfit composition
      await expect(page.getByText(`Current Outfit (${casualOutfitItems.length} items)`)).toBeVisible();
      await outfitCreator.verifyOutfitContainsItems(casualOutfitItems.map(item => item.name));
      
      // Save first outfit
      await outfitCreator.saveOutfit('Casual Weekend Look', ['casual', 'weekend', 'comfortable']);
      await expect(outfitCreator.successMessage).toBeVisible();
      
      // Verify outfit is cleared after save
      await outfitCreator.verifyOutfitIsEmpty();
      
      // === PHASE 4: Create Second Outfit ===
      
      // Create second outfit: Elegant evening look
      await outfitCreator.enterSelectionMode();
      
      // Select different items for evening outfit
      const eveningOutfitItems = [
        itemsToUpload.find(item => item.category === 'dress') || itemsToUpload.find(item => item.category === 'outerwear')!,
        itemsToUpload.find(item => item.category === 'shoes')!
      ];
      
      for (const item of eveningOutfitItems) {
        await outfitCreator.selectClothingItem(item.name);
      }
      
      // Save second outfit
      await outfitCreator.saveOutfit('Elegant Evening Look', ['elegant', 'evening', 'formal']);
      await expect(outfitCreator.successMessage).toBeVisible();
      
      // === PHASE 5: Verify Outfits Gallery ===
      
      await navigation.navigateToOutfits();
      
      // Verify both outfits appear in gallery
      await outfitsGallery.verifyOutfitExists('Casual Weekend Look');
      await outfitsGallery.verifyOutfitExists('Elegant Evening Look');
      
      // === PHASE 6: Add More Items and Create Complex Outfit ===
      
      // Go back to upload more items
      await navigation.navigateToUpload();
      
      // Upload additional items
      const additionalItems = sampleClothingItems.slice(4); // Remaining items if any, or create new ones
      if (additionalItems.length > 0) {
        await uploadPage.uploadTestImage();
        await uploadPage.editItemDetails(0, additionalItems[0]);
        await uploadPage.saveAllItems();
        await expect(uploadPage.successMessage).toBeVisible();
      }
      
      // Create a more complex outfit with accessories
      await navigation.navigateToCreateOutfit();
      await outfitCreator.enterSelectionMode();
      
      // Select multiple items including the new one
      const complexOutfitItems = itemsToUpload.slice(0, 3);
      for (const item of complexOutfitItems) {
        await outfitCreator.selectClothingItem(item.name);
      }
      
      await outfitCreator.saveOutfit('Complete Look', ['complete', 'stylish', 'coordinated']);
      await expect(outfitCreator.successMessage).toBeVisible();
      
      // === PHASE 7: Final Verification ===
      
      // Verify final state in outfits gallery
      await navigation.navigateToOutfits();
      await outfitsGallery.verifyOutfitExists('Casual Weekend Look');
      await outfitsGallery.verifyOutfitExists('Elegant Evening Look');
      await outfitsGallery.verifyOutfitExists('Complete Look');
      
      // Verify we can navigate back to other sections
      await navigation.navigateToUpload();
      await expect(page.getByText('Upload Clothing Items')).toBeVisible();
      
      await navigation.navigateToCreateOutfit();
      await expect(page.getByText('Create Outfit')).toBeVisible();
      
      // Verify wardrobe persistence
      const totalExpectedItems = itemsToUpload.length + (additionalItems.length > 0 ? 1 : 0);
      await expect(page.getByText(`Your Wardrobe (${totalExpectedItems} items)`)).toBeVisible();
    });
  });

  test.describe('Cross-Browser Workflow Consistency', () => {
    test('should work consistently across different browsers', async ({ page, browserName }) => {
      // This test will automatically run on all configured browsers
      
      // Upload an item
      await navigation.navigateToUpload();
      await uploadPage.uploadTestImage();
      await uploadPage.editItemDetails(0, sampleClothingItems[0]);
      await uploadPage.saveAllItems();
      await expect(uploadPage.successMessage).toBeVisible();
      
      // Create outfit
      await navigation.navigateToCreateOutfit();
      await outfitCreator.enterSelectionMode();
      await outfitCreator.selectClothingItem(sampleClothingItems[0].name);
      await outfitCreator.saveOutfit(`Test Outfit ${browserName}`, ['test']);
      await expect(outfitCreator.successMessage).toBeVisible();
      
      // Verify in gallery
      await navigation.navigateToOutfits();
      await outfitsGallery.verifyOutfitExists(`Test Outfit ${browserName}`);
      
      // Take browser-specific screenshot for comparison
      await expect(page).toHaveScreenshot(`workflow-complete-${browserName}.png`);
    });
  });

  test.describe('Responsive Workflow Testing', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test mobile upload workflow
      await navigation.navigateToUpload();
      
      // Verify mobile-friendly upload interface
      await expect(page.getByText('Upload Clothing Items')).toBeVisible();
      const uploadArea = uploadPage.uploadDropZone;
      const boundingBox = await uploadArea.boundingBox();
      expect(boundingBox?.width).toBeLessThan(400);
      
      // Upload on mobile
      await uploadPage.uploadTestImage();
      await uploadPage.editItemDetails(0, sampleClothingItems[0]);
      
      // Verify mobile form interaction
      const editButton = page.getByRole('button', { name: /edit details/i }).first();
      await editButton.click();
      
      // Verify mobile dialog
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      
      // Check that dialog fits mobile screen
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox?.width).toBeLessThan(400);
      
      await page.getByRole('button', { name: 'Cancel' }).click();
      
      // Complete mobile workflow
      await uploadPage.saveAllItems();
      await expect(uploadPage.successMessage).toBeVisible();
      
      // Test mobile outfit creation
      await navigation.navigateToCreateOutfit();
      
      // Verify mobile outfit creator layout
      await expect(outfitCreator.addItemsButton).toBeVisible();
      const buttonContainer = page.locator('text=Add Items').locator('..');
      const buttonBox = await buttonContainer.boundingBox();
      expect(buttonBox?.width).toBeLessThan(400);
      
      // Create outfit on mobile
      await outfitCreator.enterSelectionMode();
      await outfitCreator.selectClothingItem(sampleClothingItems[0].name);
      await outfitCreator.saveOutfit('Mobile Test Outfit', ['mobile']);
      await expect(outfitCreator.successMessage).toBeVisible();
      
      // Verify mobile outfit gallery
      await navigation.navigateToOutfits();
      await outfitsGallery.verifyOutfitExists('Mobile Test Outfit');
    });

    test('should work on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Test tablet workflow
      await navigation.navigateToUpload();
      await uploadPage.uploadTestImage();
      await uploadPage.editItemDetails(0, sampleClothingItems[0]);
      await uploadPage.saveAllItems();
      await expect(uploadPage.successMessage).toBeVisible();
      
      // Verify tablet layout in outfit creator
      await navigation.navigateToCreateOutfit();
      await expect(page.getByText('Create Outfit')).toBeVisible();
      
      // Check that elements utilize tablet screen space appropriately
      const outfitSection = outfitCreator.currentOutfitSection;
      const boundingBox = await outfitSection.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(500); // Should use more space than mobile
      expect(boundingBox?.width).toBeLessThan(800); // But not exceed tablet width
      
      // Complete tablet workflow
      await outfitCreator.enterSelectionMode();
      await outfitCreator.selectClothingItem(sampleClothingItems[0].name);
      await outfitCreator.saveOutfit('Tablet Test Outfit', ['tablet']);
      await expect(outfitCreator.successMessage).toBeVisible();
    });

    test('should adapt to different screen orientations', async ({ page }) => {
      const testItem = sampleClothingItems[0];
      
      // Setup data first
      await navigation.navigateToUpload();
      await uploadPage.uploadTestImage();
      await uploadPage.editItemDetails(0, testItem);
      await uploadPage.saveAllItems();
      
      // Test portrait orientation
      await page.setViewportSize({ width: 768, height: 1024 });
      await navigation.navigateToCreateOutfit();
      await expect(page.getByText('Create Outfit')).toBeVisible();
      
      // Test landscape orientation
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForTimeout(500); // Let layout adjust
      await expect(page.getByText('Create Outfit')).toBeVisible();
      
      // Verify functionality works in landscape
      await outfitCreator.enterSelectionMode();
      await outfitCreator.selectClothingItem(testItem.name);
      await outfitCreator.saveOutfit('Landscape Test', ['landscape']);
      await expect(outfitCreator.successMessage).toBeVisible();
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should handle multiple rapid uploads', async ({ page }) => {
      await navigation.navigateToUpload();
      
      // Upload multiple items quickly
      const itemsToUpload = sampleClothingItems.slice(0, 3);
      
      for (let i = 0; i < itemsToUpload.length; i++) {
        await uploadPage.uploadTestImage();
        // Don't wait between uploads to test rapid interaction
      }
      
      // Wait for all processing to complete
      await page.waitForTimeout(2000);
      
      // Edit all items
      for (let i = 0; i < itemsToUpload.length; i++) {
        await uploadPage.editItemDetails(i, itemsToUpload[i]);
      }
      
      // Save all at once
      await uploadPage.saveAllItems();
      await expect(uploadPage.successMessage).toBeVisible();
      
      // Verify all items were saved
      await navigation.navigateToCreateOutfit();
      for (const item of itemsToUpload) {
        await expect(page.getByText(item.name)).toBeVisible();
      }
    });

    test('should handle network interruption gracefully', async ({ page }) => {
      // This test simulates poor network conditions
      
      await navigation.navigateToUpload();
      await uploadPage.uploadTestImage();
      await uploadPage.editItemDetails(0, sampleClothingItems[0]);
      
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100);
      });
      
      await uploadPage.saveAllItems();
      
      // Should still work despite slow network
      await expect(uploadPage.successMessage).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Data Persistence and State Management', () => {
    test('should persist data across page refreshes', async ({ page }) => {
      // Upload and save an item
      await navigation.navigateToUpload();
      await uploadPage.uploadTestImage();
      await uploadPage.editItemDetails(0, sampleClothingItems[0]);
      await uploadPage.saveAllItems();
      
      // Create an outfit
      await navigation.navigateToCreateOutfit();
      await outfitCreator.enterSelectionMode();
      await outfitCreator.selectClothingItem(sampleClothingItems[0].name);
      await outfitCreator.saveOutfit('Persistence Test', ['persistent']);
      await expect(outfitCreator.successMessage).toBeVisible();
      
      // Refresh the page
      await page.reload();
      
      // Verify data persists after refresh
      await navigation.navigateToCreateOutfit();
      await expect(page.getByText(sampleClothingItems[0].name)).toBeVisible();
      
      await navigation.navigateToOutfits();
      await outfitsGallery.verifyOutfitExists('Persistence Test');
    });

    test('should handle browser storage limits gracefully', async ({ page }) => {
      // This test checks behavior when approaching storage limits
      
      await navigation.navigateToUpload();
      
      // Try to upload many items (simulating storage pressure)
      const manyItems = Array.from({ length: 10 }, (_, i) => ({
        ...sampleClothingItems[0],
        name: `Test Item ${i + 1}`
      }));
      
      for (let i = 0; i < manyItems.length; i++) {
        await uploadPage.uploadTestImage();
        await uploadPage.editItemDetails(i, manyItems[i]);
      }
      
      // Try to save all items
      await uploadPage.saveAllItems();
      
      // Should either succeed or show appropriate error
      const isSuccess = await uploadPage.successMessage.isVisible({ timeout: 5000 }).catch(() => false);
      const isError = await uploadPage.errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(isSuccess || isError).toBe(true);
      
      if (isError) {
        // If storage error, verify error message is helpful
        await expect(page.getByText(/storage quota exceeded|storage access denied/i)).toBeVisible();
      }
    });
  });

  test.describe('Visual Consistency Testing', () => {
    test('should maintain visual consistency throughout workflow', async ({ page }) => {
      // Take baseline screenshots at each major step
      
      // Home page
      await expect(page).toHaveScreenshot('workflow-01-home.png');
      
      // Upload page
      await navigation.navigateToUpload();
      await expect(page).toHaveScreenshot('workflow-02-upload-empty.png');
      
      // Upload with items
      await uploadPage.uploadTestImage();
      await uploadPage.editItemDetails(0, sampleClothingItems[0]);
      await expect(page).toHaveScreenshot('workflow-03-upload-with-items.png');
      
      // After save
      await uploadPage.saveAllItems();
      await expect(uploadPage.successMessage).toBeVisible();
      await expect(page).toHaveScreenshot('workflow-04-upload-success.png');
      
      // Outfit creator empty
      await navigation.navigateToCreateOutfit();
      await expect(page).toHaveScreenshot('workflow-05-outfit-creator-empty.png');
      
      // Outfit creator with items
      await outfitCreator.enterSelectionMode();
      await outfitCreator.selectClothingItem(sampleClothingItems[0].name);
      await expect(page).toHaveScreenshot('workflow-06-outfit-with-items.png');
      
      // After outfit save
      await outfitCreator.saveOutfit('Visual Test Outfit', ['visual']);
      await expect(outfitCreator.successMessage).toBeVisible();
      await expect(page).toHaveScreenshot('workflow-07-outfit-saved.png');
      
      // Outfits gallery
      await navigation.navigateToOutfits();
      await expect(page).toHaveScreenshot('workflow-08-outfits-gallery.png');
    });
  });
});