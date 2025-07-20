import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ClothingUpload from '../components/ClothingUpload';
import OutfitCreator from '../components/OutfitCreator';
import { ClothingItem } from '../types';

// Mock iOS user agent
const mockIOSUserAgent = () => {
  Object.defineProperty(window.navigator, 'userAgent', {
    writable: true,
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
};

// Mock Chrome user agent
const mockChromeUserAgent = () => {
  Object.defineProperty(window.navigator, 'userAgent', {
    writable: true,
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
};

// Mock viewport for mobile
const mockMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667
  });
};

// Mock viewport for desktop
const mockDesktopViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1920
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 1080
  });
};

// Mock crypto and other globals
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: vi.fn(() => 'test-uuid') }
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  }
});

class MockFileReader {
  result: string | null = null;
  onload: ((event: any) => void) | null = null;
  
  readAsDataURL(file: File) {
    setTimeout(() => {
      this.result = `data:image/jpeg;base64,mock-${file.name}`;
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }, 0);
  }
}

Object.defineProperty(global, 'FileReader', {
  value: MockFileReader
});

describe('iOS Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ClothingUpload on iOS', () => {
    it('should prevent iOS keyboard zoom and maintain focus', async () => {
      mockIOSUserAgent();
      mockMobileViewport();
      
      const user = userEvent.setup();
      const mockSave = vi.fn();
      render(<ClothingUpload onSave={mockSave} />);
      
      // Add a file
      const fileInput = screen.getByLabelText(/select files/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);
      
      // Open edit dialog
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      // Test color input specifically
      const colorInput = await screen.findByLabelText(/color/i);
      
      // Verify iOS-specific attributes
      expect(colorInput).toHaveAttribute('autocomplete', 'off');
      expect(colorInput).toHaveAttribute('autocorrect', 'off');
      expect(colorInput).toHaveAttribute('autocapitalize', 'off');
      expect(colorInput).toHaveAttribute('spellcheck', 'false');
      
      // Verify font size to prevent zoom
      expect(colorInput).toHaveStyle({ fontSize: '16px' });
      
      // Test typing behavior
      await user.click(colorInput);
      await user.type(colorInput, 'red');
      
      expect(colorInput).toHaveValue('red');
      expect(colorInput).toHaveFocus();
    });

    it('should handle touch events properly on iOS', async () => {
      mockIOSUserAgent();
      mockMobileViewport();
      
      const user = userEvent.setup();
      const mockSave = vi.fn();
      render(<ClothingUpload onSave={mockSave} />);
      
      // Test drag and drop area touch handling
      const dropArea = screen.getByText(/drag & drop images/i).closest('div');
      expect(dropArea).toBeInTheDocument();
      
      // Test file selection
      const fileInput = screen.getByLabelText(/select files/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('test.jpg')).toBeInTheDocument();
      });
    });
  });

  describe('ClothingUpload on Chrome Desktop', () => {
    it('should work normally on Chrome desktop', async () => {
      mockChromeUserAgent();
      mockDesktopViewport();
      
      const user = userEvent.setup();
      const mockSave = vi.fn();
      render(<ClothingUpload onSave={mockSave} />);
      
      // Add and edit item
      const fileInput = screen.getByLabelText(/select files/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      // Fill required fields
      const nameInput = await screen.findByLabelText(/name/i);
      const categorySelect = await screen.findByLabelText(/category/i);
      const colorInput = await screen.findByLabelText(/color/i);
      
      await user.clear(nameInput);
      await user.type(nameInput, 'Test Item');
      await user.click(categorySelect);
      await user.click(screen.getByText('Tops'));
      await user.type(colorInput, 'Blue');
      
      await user.click(screen.getByText('Save'));
      
      // Save all items
      await waitFor(() => {
        const saveButton = screen.getByText('Save All Items');
        return user.click(saveButton);
      });
      
      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Test Item',
            category: 'tops',
            color: 'Blue'
          })
        ]);
      });
    });
  });

  describe('OutfitCreator cross-platform', () => {
    const mockItems: ClothingItem[] = [
      {
        id: '1',
        name: 'Test Shirt',
        category: 'tops',
        color: 'blue',
        image: 'data:image/jpeg;base64,test',
        tags: [],
        dateAdded: '2024-01-01T00:00:00.000Z'
      }
    ];

    it('should handle outfit creation on iOS', async () => {
      mockIOSUserAgent();
      mockMobileViewport();
      
      const user = userEvent.setup();
      const mockSaveOutfit = vi.fn();
      render(<OutfitCreator clothingItems={mockItems} onSaveOutfit={mockSaveOutfit} />);
      
      // Enter selection mode
      await user.click(screen.getByText('Add Items'));
      
      // Select item
      const itemCard = screen.getByText('Test Shirt').closest('.MuiCard-root');
      if (itemCard) await user.click(itemCard);
      
      // Open save dialog
      await user.click(screen.getByText('Save Outfit'));
      
      // Test iOS-specific input behavior
      const nameInput = await screen.findByLabelText(/outfit name/i);
      expect(nameInput).toHaveAttribute('autocomplete', 'off');
      expect(nameInput).toHaveStyle({ fontSize: '16px' });
      
      await user.type(nameInput, 'Test Outfit');
      
      // Save outfit
      const saveButton = screen.getByRole('button', { name: /save outfit/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockSaveOutfit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Outfit'
          })
        );
      });
    });

    it('should handle outfit creation on Chrome', async () => {
      mockChromeUserAgent();
      mockDesktopViewport();
      
      const user = userEvent.setup();
      const mockSaveOutfit = vi.fn();
      render(<OutfitCreator clothingItems={mockItems} onSaveOutfit={mockSaveOutfit} />);
      
      // Same workflow should work on desktop
      await user.click(screen.getByText('Add Items'));
      
      const itemCard = screen.getByText('Test Shirt').closest('.MuiCard-root');
      if (itemCard) await user.click(itemCard);
      
      await user.click(screen.getByText('Save Outfit'));
      
      const nameInput = await screen.findByLabelText(/outfit name/i);
      await user.type(nameInput, 'Desktop Outfit');
      
      const saveButton = screen.getByRole('button', { name: /save outfit/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockSaveOutfit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Desktop Outfit'
          })
        );
      });
    });
  });

  describe('Storage error handling across platforms', () => {
    it('should handle storage quota errors consistently', async () => {
      const mockSave = vi.fn().mockRejectedValue(new Error('Storage quota exceeded'));
      
      // Test on iOS
      mockIOSUserAgent();
      const { unmount } = render(<ClothingUpload onSave={mockSave} />);
      
      const user = userEvent.setup();
      const fileInput = screen.getByLabelText(/select files/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      const nameInput = await screen.findByLabelText(/name/i);
      const categorySelect = await screen.findByLabelText(/category/i);
      
      await user.clear(nameInput);
      await user.type(nameInput, 'Test');
      await user.click(categorySelect);
      await user.click(screen.getByText('Tops'));
      await user.click(screen.getByText('Save'));
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save All Items');
        return user.click(saveButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/storage quota exceeded/i)).toBeInTheDocument();
      });
      
      unmount();
      
      // Test on Chrome - should show same error
      mockChromeUserAgent();
      render(<ClothingUpload onSave={mockSave} />);
      
      // Same test flow should show same error message
      const fileInput2 = screen.getByLabelText(/select files/i);
      await user.upload(fileInput2, file);
      
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      const nameInput2 = await screen.findByLabelText(/name/i);
      const categorySelect2 = await screen.findByLabelText(/category/i);
      
      await user.clear(nameInput2);
      await user.type(nameInput2, 'Test');
      await user.click(categorySelect2);
      await user.click(screen.getByText('Tops'));
      await user.click(screen.getByText('Save'));
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save All Items');
        return user.click(saveButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/storage quota exceeded/i)).toBeInTheDocument();
      });
    });
  });

  describe('Viewport responsiveness', () => {
    it('should adapt to mobile viewport', async () => {
      mockMobileViewport();
      
      const mockSave = vi.fn();
      render(<ClothingUpload onSave={mockSave} />);
      
      // Dialog should adapt to mobile viewport
      const user = userEvent.setup();
      const fileInput = screen.getByLabelText(/select files/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      // Dialog should be present and responsive
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should adapt to desktop viewport', async () => {
      mockDesktopViewport();
      
      const mockSave = vi.fn();
      render(<ClothingUpload onSave={mockSave} />);
      
      const user = userEvent.setup();
      const fileInput = screen.getByLabelText(/select files/i);
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });
});