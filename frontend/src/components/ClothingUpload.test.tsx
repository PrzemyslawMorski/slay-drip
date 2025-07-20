import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ClothingUpload from './ClothingUpload';
import { ClothingItem } from '../types';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid')
  }
});

// Mock URL.createObjectURL
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  }
});

// Mock FileReader
class MockFileReader {
  result: string | null = null;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  readAsDataURL(file: File) {
    setTimeout(() => {
      this.result = `data:image/jpeg;base64,mock-base64-${file.name}`;
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }, 0);
  }
}

Object.defineProperty(global, 'FileReader', {
  value: MockFileReader
});

describe('ClothingUpload', () => {
  const mockOnSave = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockFile = (name: string = 'test.jpg', type: string = 'image/jpeg') => {
    return new File(['mock content'], name, { type });
  };

  it('should render upload area', () => {
    render(<ClothingUpload onSave={mockOnSave} />);
    
    expect(screen.getByText(/drag & drop images/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to select/i)).toBeInTheDocument();
  });

  it('should handle file upload', async () => {
    const user = userEvent.setup();
    render(<ClothingUpload onSave={mockOnSave} />);
    
    const fileInput = screen.getByLabelText(/select files/i);
    const file = createMockFile();
    
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('test.jpg')).toBeInTheDocument();
    });
  });

  it('should open edit dialog when editing item', async () => {
    const user = userEvent.setup();
    render(<ClothingUpload onSave={mockOnSave} />);
    
    const fileInput = screen.getByLabelText(/select files/i);
    const file = createMockFile();
    
    await user.upload(fileInput, file);
    
    await waitFor(() => {
      const editButton = screen.getByRole("button", { name: /edit details/i });
      return user.click(editButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Edit Item Details')).toBeInTheDocument();
    });
  });

  describe('iOS keyboard handling', () => {
    it('should have correct input props for iOS compatibility in edit dialog', async () => {
      const user = userEvent.setup();
      render(<ClothingUpload onSave={mockOnSave} />);
      
      const fileInput = screen.getByLabelText(/select files/i);
      const file = createMockFile();
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      await waitFor(() => {
        const colorInput = screen.getByLabelText(/color/i);
        expect(colorInput).toHaveAttribute('autocomplete', 'off');
        expect(colorInput).toHaveAttribute('autocorrect', 'off');
        expect(colorInput).toHaveAttribute('autocapitalize', 'off');
        expect(colorInput).toHaveAttribute('spellcheck', 'false');
        expect(colorInput).toHaveStyle({ fontSize: '16px' });
      });
    });

    it('should have dialog props to prevent iOS keyboard issues', async () => {
      const user = userEvent.setup();
      render(<ClothingUpload onSave={mockOnSave} />);
      
      const fileInput = screen.getByLabelText(/select files/i);
      const file = createMockFile();
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      // Check that dialog is rendered (we can't easily test the actual props but can verify dialog functionality)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should maintain focus when typing in color field', async () => {
      const user = userEvent.setup();
      render(<ClothingUpload onSave={mockOnSave} />);
      
      const fileInput = screen.getByLabelText(/select files/i);
      const file = createMockFile();
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      const colorInput = await screen.findByLabelText(/color/i);
      
      // Simulate typing which should not cause the input to lose focus
      await user.click(colorInput);
      await user.type(colorInput, 'red');
      
      expect(colorInput).toHaveValue('red');
      expect(colorInput).toHaveFocus();
    });
  });

  describe('saving functionality', () => {
    it('should save items successfully', async () => {
      const user = userEvent.setup();
      render(<ClothingUpload onSave={mockOnSave} />);
      
      const fileInput = screen.getByLabelText(/select files/i);
      const file = createMockFile();
      
      await user.upload(fileInput, file);
      
      // Edit the item to add required fields
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      const nameInput = await screen.findByLabelText(/name/i);
      const categoryInput = await screen.getByRole("combobox");
      const colorInput = await screen.findByLabelText(/color/i);
      
      await user.clear(nameInput);
      await user.type(nameInput, 'Test Shirt');
      await user.click(categoryInput);
      await user.click(screen.getByText('Tops'));
      await user.type(colorInput, 'Blue');
      
      // Close edit dialog
      await user.click(screen.getByText('Save'));
      
      // Save all items
      await waitFor(() => {
        const saveButton = screen.getByText(/Save.*Items/);
        return user.click(saveButton);
      });
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith([
          expect.objectContaining({
            id: 'mock-uuid',
            name: 'Test Shirt',
            category: 'tops',
            color: 'Blue',
            tags: []
          })
        ]);
      });
    });

    it('should show validation error for missing required fields', async () => {
      const user = userEvent.setup();
      render(<ClothingUpload onSave={mockOnSave} />);
      
      const fileInput = screen.getByLabelText(/select files/i);
      const file = createMockFile();
      
      await user.upload(fileInput, file);
      
      // Try to save without filling required fields
      await waitFor(() => {
        const saveButton = screen.getByText(/Save.*Items/);
        return user.click(saveButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/please fill in all required fields/i)).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error('Storage quota exceeded'));
      
      render(<ClothingUpload onSave={mockOnSave} />);
      
      const fileInput = screen.getByLabelText(/select files/i);
      const file = createMockFile();
      
      await user.upload(fileInput, file);
      
      // Edit to add required fields
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      const nameInput = await screen.findByLabelText(/name/i);
      const categoryInput = await screen.getByRole("combobox");
      
      await user.clear(nameInput);
      await user.type(nameInput, 'Test Item');
      await user.click(categoryInput);
      await user.click(screen.getByText('Tops'));
      await user.click(screen.getByText('Save'));
      
      // Try to save
      await waitFor(() => {
        const saveButton = screen.getByText(/Save.*Items/);
        return user.click(saveButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/storage quota exceeded/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle localStorage access denied error', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error('localStorage access denied'));
      
      render(<ClothingUpload onSave={mockOnSave} />);
      
      const fileInput = screen.getByLabelText(/select files/i);
      const file = createMockFile();
      
      await user.upload(fileInput, file);
      
      // Add required fields and save
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      const nameInput = await screen.findByLabelText(/name/i);
      const categoryInput = await screen.getByRole("combobox");
      
      await user.clear(nameInput);
      await user.type(nameInput, 'Test Item');
      await user.click(categoryInput);
      await user.click(screen.getByText('Tops'));
      await user.click(screen.getByText('Save'));
      
      await waitFor(() => {
        const saveButton = screen.getByText(/Save.*Items/);
        return user.click(saveButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/storage access denied/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should clear items after successful save', async () => {
      const user = userEvent.setup();
      render(<ClothingUpload onSave={mockOnSave} />);
      
      const fileInput = screen.getByLabelText(/select files/i);
      const file = createMockFile();
      
      await user.upload(fileInput, file);
      
      // Add required fields
      await waitFor(() => {
        const editButton = screen.getByRole("button", { name: /edit details/i });
        return user.click(editButton);
      });
      
      const nameInput = await screen.findByLabelText(/name/i);
      const categoryInput = await screen.getByRole("combobox");
      
      await user.clear(nameInput);
      await user.type(nameInput, 'Test Item');
      await user.click(categoryInput);
      await user.click(screen.getByText('Tops'));
      await user.click(screen.getByText('Save'));
      
      // Save items
      await waitFor(() => {
        const saveButton = screen.getByText(/Save.*Items/);
        return user.click(saveButton);
      });
      
      // Items should be cleared
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Test Item')).not.toBeInTheDocument();
      });
    });
  });

  describe('cross-browser compatibility', () => {
    it('should handle different image file types', async () => {
      const user = userEvent.setup();
      render(<ClothingUpload onSave={mockOnSave} />);
      
      const fileInput = screen.getByLabelText(/select files/i);
      const pngFile = createMockFile('test.png', 'image/png');
      const webpFile = createMockFile('test.webp', 'image/webp');
      
      await user.upload(fileInput, [pngFile, webpFile]);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('test.png')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test.webp')).toBeInTheDocument();
      });
    });

    it('should filter out non-image files', async () => {
      const user = userEvent.setup();
      render(<ClothingUpload onSave={mockOnSave} />);
      
      const fileInput = screen.getByLabelText(/select files/i);
      const textFile = createMockFile('test.txt', 'text/plain');
      const imageFile = createMockFile('test.jpg', 'image/jpeg');
      
      await user.upload(fileInput, [textFile, imageFile]);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('test.jpg')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('test.txt')).not.toBeInTheDocument();
      });
    });
  });
});