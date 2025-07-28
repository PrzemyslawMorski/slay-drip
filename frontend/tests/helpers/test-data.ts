/**
 * Test data helpers for consistent testing across the wardrobe app
 */

export interface TestClothingItem {
  name: string;
  category: 'tops' | 'bottoms' | 'dress' | 'shoes' | 'accessories' | 'bag' | 'hat' | 'outerwear';
  color: string;
  brand: string;
  tags: string[];
}

export const sampleClothingItems: TestClothingItem[] = [
  {
    name: 'Blue Cotton T-Shirt',
    category: 'tops',
    color: 'Blue',
    brand: 'H&M',
    tags: ['casual', 'summer', 'cotton']
  },
  {
    name: 'Black Leather Jacket',
    category: 'outerwear',
    color: 'Black',
    brand: 'Zara',
    tags: ['formal', 'leather', 'winter']
  },
  {
    name: 'Dark Blue Jeans',
    category: 'bottoms',
    color: 'Dark Blue',
    brand: 'Levi\'s',
    tags: ['casual', 'denim', 'everyday']
  },
  {
    name: 'White Sneakers',
    category: 'shoes',
    color: 'White',
    brand: 'Nike',
    tags: ['casual', 'sports', 'comfortable']
  },
  {
    name: 'Red Summer Dress',
    category: 'dress',
    color: 'Red',
    brand: 'ASOS',
    tags: ['summer', 'elegant', 'party']
  }
];

export const testOutfits = [
  {
    name: 'Casual Weekend Look',
    tags: ['casual', 'weekend', 'comfortable'],
    items: ['Blue Cotton T-Shirt', 'Dark Blue Jeans', 'White Sneakers']
  },
  {
    name: 'Evening Party Outfit',
    tags: ['party', 'elegant', 'evening'],
    items: ['Red Summer Dress', 'Black Leather Jacket']
  }
];

// Generate a test image data URL (1x1 transparent pixel)
export const generateTestImageDataUrl = (): string => {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
};

// Create a test File object for upload testing
export const createTestImageFile = (name: string = 'test-image.jpg'): File => {
  // Create a simple 1x1 JPEG-like blob
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 1, 1);
  }
  
  return new Promise<File>((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob!], name, { type: 'image/jpeg' });
      resolve(file);
    }, 'image/jpeg');
  }) as any; // Type assertion for test purposes
};

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility for generating unique test identifiers for parallel execution
export const generateTestId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test_${timestamp}_${random}`;
};

// Utility for creating isolated test database names
export const generateTestDatabaseName = (): string => {
  return `wardrobeState_${generateTestId()}`;
};