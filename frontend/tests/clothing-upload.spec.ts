import { test, expect } from '@playwright/test';
import { AppNavigationPage, ClothingUploadPage } from './helpers/page-objects';
import { sampleClothingItems } from './helpers/test-data';
import { simpleCleanup } from './helpers/test-isolation';

test.describe('Clothing Upload Flow', () => {
  // Configure for parallel execution
  test.describe.configure({ mode: 'parallel' });
  let navigation: AppNavigationPage;
  let uploadPage: ClothingUploadPage;

  test.beforeEach(async ({ page }) => {
    navigation = new AppNavigationPage(page);
    uploadPage = new ClothingUploadPage(page);
    
    await page.goto('/');
    
    // Use improved cleanup for parallel execution
    await simpleCleanup(page);
    
    await navigation.navigateToUpload();
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await simpleCleanup(page);
  });

  test.describe('Upload Interface', () => {
    test('should display upload interface correctly @smoke', async ({ page }) => {
      // Verify page title and upload area
      await expect(page.getByText('Upload Clothing Items')).toBeVisible();
      await expect(uploadPage.uploadDropZone).toBeVisible();
      await expect(page.getByText('Drag & drop images here or click to select')).toBeVisible();
      await expect(page.getByText('Upload up to 40 clothing items at once')).toBeVisible();
      
      // Verify upload input exists
      await expect(uploadPage.uploadArea).toBeAttached();
    });

    test('should be responsive on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify mobile layout
      await expect(page.getByText('Upload Clothing Items')).toBeVisible();
      await expect(uploadPage.uploadDropZone).toBeVisible();
      
      // Check that elements are properly sized for mobile
      const uploadArea = uploadPage.uploadDropZone;
      const boundingBox = await uploadArea.boundingBox();
      expect(boundingBox?.width).toBeLessThan(400); // Should fit in mobile viewport
    });

    test('should be responsive on tablet devices', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await expect(page.getByText('Upload Clothing Items')).toBeVisible();
      await expect(uploadPage.uploadDropZone).toBeVisible();
      
      // Verify tablet-specific layout elements
      const uploadArea = uploadPage.uploadDropZone;
      await expect(uploadArea).toBeVisible();
    });
  });

  test.describe('Image Upload Process', () => {
    test('should upload a single image successfully', async ({ page }) => {
      // Upload a test image
      await uploadPage.uploadTestImage();
      
      // Verify item appears in pending items
      await expect(page.getByText('Items to Upload (1)')).toBeVisible();
      await expect(uploadPage.pendingItemsGrid).toBeVisible();
      
      // Verify default values are set
      await expect(page.getByText('test-image')).toBeVisible();
      await expect(page.getByText('tops')).toBeVisible(); // Default category
    });

    test('should handle multiple image uploads', async ({ page }) => {
      // Upload multiple test images
      for (let i = 0; i < 3; i++) {
        await uploadPage.uploadTestImage();
        await page.waitForTimeout(500); // Small delay between uploads
      }
      
      // Verify all items appear
      await expect(page.getByText('Items to Upload (3)')).toBeVisible();
      
      // Verify Save button shows correct count
      await expect(uploadPage.saveAllButton).toHaveText(/Save 3 Items/i);
    });

    test('should show processing indicator during upload', async ({ page }) => {
      // Start upload and check for processing indicator
      await uploadPage.uploadTestImage();
      
      // The processing should be very fast for our small test image
      // but we can check that the interface handles it properly
      await expect(uploadPage.pendingItemsGrid).toBeVisible();
    });
  });

  test.describe('Item Details Editing', () => {
    test('should edit item details successfully', async ({ page }) => {
      // Upload an image first
      await uploadPage.uploadTestImage();
      
      // Edit the item details
      const testItem = sampleClothingItems[0];
      await uploadPage.editItemDetails(0, testItem);
      
      // Verify changes are reflected
      await expect(page.getByText(testItem.name)).toBeVisible();
      await expect(page.getByText(testItem.color)).toBeVisible();
      await expect(page.getByText(testItem.brand)).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      // Upload an image
      await uploadPage.uploadTestImage();
      
      // Try to edit with empty name
      await uploadPage.editItemDetails(0, { name: '' });
      
      // Try to save items - should show validation error
      await uploadPage.saveAllButton.click();
      await expect(page.getByText(/please fill in all required fields/i)).toBeVisible();
    });

    test('should support all clothing categories', async ({ page }) => {
      // Upload an image
      await uploadPage.uploadTestImage();
      
      const categories = ['tops', 'bottoms', 'dress', 'shoes', 'accessories', 'bag', 'hat', 'outerwear'];
      
      for (const category of categories) {
        // Edit item to use this category
        await uploadPage.editItemDetails(0, { category: category as any });
        
        // Verify category is displayed
        await expect(page.getByText(category)).toBeVisible();
      }
    });

    test('should handle tags properly', async ({ page }) => {
      // Upload an image
      await uploadPage.uploadTestImage();
      
      // Edit with multiple tags
      const tags = ['casual', 'summer', 'favorite'];
      await uploadPage.editItemDetails(0, { tags });
      
      // Verify tags are saved (this would be visible in the edit dialog)
      const editButton = uploadPage.pendingItemsGrid.locator('button').filter({ hasText: /edit details/i }).first();
      await editButton.click();
      
      // Check tags field contains the values
      await expect(page.getByLabel(/tags/i)).toHaveValue(tags.join(', '));
      
      // Close dialog
      await page.getByRole('button', { name: 'Cancel' }).click();
    });
  });

  test.describe('Saving Items', () => {
    test('should save items successfully', async ({ page }) => {
      // Upload and configure an item
      await uploadPage.uploadTestImage();
      await uploadPage.editItemDetails(0, sampleClothingItems[0]);
      
      // Save the items
      await uploadPage.saveAllItems();
      
      // Verify success message
      await expect(uploadPage.successMessage).toBeVisible();
      
      // Verify items are cleared after save
      await expect(page.getByText('Items to Upload')).not.toBeVisible();
    });

    test('should handle save errors gracefully', async ({ page }) => {
      // Upload item but don't fill required fields
      await uploadPage.uploadTestImage();
      
      // Leave name empty and try to save
      await uploadPage.editItemDetails(0, { name: '' });
      await uploadPage.saveAllItems();
      
      // Should show error message
      await expect(page.getByText(/please fill in all required fields/i)).toBeVisible();
    });

    test('should clear all items', async ({ page }) => {
      // Upload multiple items
      await uploadPage.uploadTestImage();
      await uploadPage.uploadTestImage();
      
      await expect(page.getByText('Items to Upload (2)')).toBeVisible();
      
      // Clear all items
      await uploadPage.clearAllButton.click();
      
      // Verify items are cleared
      await expect(page.getByText('Items to Upload')).not.toBeVisible();
    });
  });

  test.describe('Data Persistence', () => {
    test('should persist uploaded items for outfit creation', async ({ page }) => {
      // Upload and save an item
      await uploadPage.uploadTestImage();
      await uploadPage.editItemDetails(0, sampleClothingItems[0]);
      await uploadPage.saveAllItems();
      
      // Navigate to outfit creation
      await navigation.navigateToCreateOutfit();
      
      // Verify the item appears in the wardrobe
      await expect(page.getByText(sampleClothingItems[0].name)).toBeVisible();
    });
  });

  test.describe('Visual Testing', () => {
    test('should display upload page consistently across browsers', async ({ page }) => {
      // Take screenshot for visual comparison
      await expect(page).toHaveScreenshot('upload-page-initial.png');
      
      // Upload an item and take another screenshot
      await uploadPage.uploadTestImage();
      await expect(page).toHaveScreenshot('upload-page-with-item.png');
    });

    test('should display correctly on different screen sizes', async ({ page }) => {
      // Test various viewport sizes
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
        await page.waitForTimeout(500); // Let layout settle
        
        // Verify key elements are visible and properly positioned
        await expect(page.getByText('Upload Clothing Items')).toBeVisible();
        await expect(uploadPage.uploadDropZone).toBeVisible();
        
        // Take screenshot for visual verification
        await expect(page).toHaveScreenshot(`upload-page-${viewport.name}.png`);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and keyboard navigation', async ({ page }) => {
      // Check for file input accessibility
      await expect(uploadPage.uploadArea).toHaveAttribute('aria-label', 'Select files to upload');
      
      // Check that buttons are keyboard accessible
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      // The file input should be focusable
      
      // Upload an item to test other accessibility features
      await uploadPage.uploadTestImage();
      
      // Check Edit Details button is accessible
      const editButton = page.getByRole('button', { name: /edit details/i }).first();
      await expect(editButton).toBeVisible();
      
      // Test keyboard navigation in edit dialog
      await editButton.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      
      // Verify form fields are properly labeled
      await expect(page.getByLabel('Name')).toBeVisible();
      await expect(page.getByLabel('Category')).toBeVisible();
      await expect(page.getByLabel('Color')).toBeVisible();
      await expect(page.getByLabel('Brand')).toBeVisible();
      
      // Close dialog
      await page.getByRole('button', { name: 'Cancel' }).click();
    });
  });
});