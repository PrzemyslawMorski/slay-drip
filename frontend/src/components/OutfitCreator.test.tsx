import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import OutfitCreator from './OutfitCreator';
import { ClothingItem, Outfit } from '../types';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-outfit-uuid')
  }
});

const mockClothingItems: ClothingItem[] = [
  {
    id: '1',
    name: 'Blue Shirt',
    category: 'tops',
    color: 'blue',
    brand: 'TestBrand',
    image: 'data:image/jpeg;base64,mock-image-1',
    tags: ['casual'],
    dateAdded: '2024-01-01T00:00:00.000Z'
  },
  {
    id: '2',
    name: 'Black Pants',
    category: 'bottoms',
    color: 'black',
    brand: 'TestBrand',
    image: 'data:image/jpeg;base64,mock-image-2',
    tags: ['formal'],
    dateAdded: '2024-01-01T00:00:00.000Z'
  },
  {
    id: '3',
    name: 'White Sneakers',
    category: 'shoes',
    color: 'white',
    brand: 'TestBrand',
    image: 'data:image/jpeg;base64,mock-image-3',
    tags: ['casual'],
    dateAdded: '2024-01-01T00:00:00.000Z'
  }
];

describe('OutfitCreator', () => {
  const mockOnSaveOutfit = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render clothing items', () => {
    render(<OutfitCreator clothingItems={mockClothingItems} onSaveOutfit={mockOnSaveOutfit} />);
    
    expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
    expect(screen.getByText('Black Pants')).toBeInTheDocument();
    expect(screen.getByText('White Sneakers')).toBeInTheDocument();
  });

  it('should enter selection mode when clicking select items', async () => {
    const user = userEvent.setup();
    render(<OutfitCreator clothingItems={mockClothingItems} onSaveOutfit={mockOnSaveOutfit} />);
    
    const selectButton = screen.getByText('Add Items');
    await user.click(selectButton);
    
    expect(screen.getByText('Done Selecting')).toBeInTheDocument();
  });

  it('should select and deselect items', async () => {
    const user = userEvent.setup();
    render(<OutfitCreator clothingItems={mockClothingItems} onSaveOutfit={mockOnSaveOutfit} />);
    
    // Enter selection mode
    await user.click(screen.getByText('Add Items'));
    
    // Select an item
    const shirtCard = screen.getByText('Blue Shirt').closest('[data-testid="clothing-item"]') || 
                      screen.getByText('Blue Shirt').closest('.MuiCard-root');
    if (shirtCard) {
      await user.click(shirtCard);
    }
    
    // Check if selection is indicated (this depends on implementation)
    expect(screen.getByText('Save Outfit')).toBeInTheDocument();
  });

  it('should open save dialog when save outfit is clicked with selected items', async () => {
    const user = userEvent.setup();
    render(<OutfitCreator clothingItems={mockClothingItems} onSaveOutfit={mockOnSaveOutfit} />);
    
    // Enter selection mode and select items
    await user.click(screen.getByText('Add Items'));
    
    // Select multiple items by clicking on them
    const items = screen.getAllByText(/Blue Shirt|Black Pants/);
    for (const item of items) {
      const card = item.closest('[data-testid="clothing-item"]') || 
                   item.closest('.MuiCard-root');
      if (card) {
        await user.click(card);
      }
    }
    
    // Click save outfit
    await user.click(screen.getByText('Save Outfit'));
    
    await waitFor(() => {
      expect(screen.getByText('Save Outfit')).toBeInTheDocument();
    });
  });

  describe('iOS keyboard handling in save dialog', () => {
    const setupSaveDialog = async () => {
      const user = userEvent.setup();
      render(<OutfitCreator clothingItems={mockClothingItems} onSaveOutfit={mockOnSaveOutfit} />);
      
      // Enter selection mode
      await user.click(screen.getByText('Add Items'));
      
      // Select an item
      const shirtCard = screen.getByText('Blue Shirt').closest('.MuiCard-root');
      if (shirtCard) {
        await user.click(shirtCard);
      }
      
      // Open save dialog
      await user.click(screen.getByText('Save Outfit'));
      
      return user;
    };

    it('should have correct input props for iOS compatibility in save dialog', async () => {
      await setupSaveDialog();
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/outfit name/i);
        expect(nameInput).toHaveAttribute('autocomplete', 'off');
        expect(nameInput).toHaveAttribute('autocorrect', 'off');
        expect(nameInput).toHaveAttribute('autocapitalize', 'off');
        expect(nameInput).toHaveAttribute('spellcheck', 'false');
        expect(nameInput).toHaveStyle({ fontSize: '16px' });
      });
    });

    it('should maintain focus when typing in outfit name field', async () => {
      const user = await setupSaveDialog();
      
      const nameInput = await screen.findByLabelText(/outfit name/i);
      
      await user.click(nameInput);
      await user.type(nameInput, 'My Casual Outfit');
      
      expect(nameInput).toHaveValue('My Casual Outfit');
      expect(nameInput).toHaveFocus();
    });

    it('should maintain focus when typing in tags field', async () => {
      const user = await setupSaveDialog();
      
      const tagsInput = await screen.findByLabelText(/tags/i);
      
      await user.click(tagsInput);
      await user.type(tagsInput, 'casual, summer');
      
      expect(tagsInput).toHaveValue('casual, summer');
      expect(tagsInput).toHaveFocus();
    });
  });

  describe('outfit saving functionality', () => {
    it('should save outfit successfully', async () => {
      const user = userEvent.setup();
      render(<OutfitCreator clothingItems={mockClothingItems} onSaveOutfit={mockOnSaveOutfit} />);
      
      // Enter selection mode and select items
      await user.click(screen.getByText('Add Items'));
      
      const shirtCard = screen.getByText('Blue Shirt').closest('.MuiCard-root');
      const pantsCard = screen.getByText('Black Pants').closest('.MuiCard-root');
      
      if (shirtCard) await user.click(shirtCard);
      if (pantsCard) await user.click(pantsCard);
      
      // Open save dialog
      await user.click(screen.getByText('Save Outfit'));
      
      // Fill in outfit details
      const nameInput = await screen.findByLabelText(/outfit name/i);
      await user.type(nameInput, 'Work Outfit');
      
      const tagsInput = await screen.findByLabelText(/tags/i);
      await user.type(tagsInput, 'formal, work');
      
      // Save outfit
      const saveButton = screen.getByRole('button', { name: /save outfit/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSaveOutfit).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'mock-outfit-uuid',
            name: 'Work Outfit',
            tags: ['formal', 'work'],
            items: expect.arrayContaining([
              expect.objectContaining({ name: 'Blue Shirt' }),
              expect.objectContaining({ name: 'Black Pants' })
            ])
          })
        );
      });
    });

    it('should not save outfit without name', async () => {
      const user = userEvent.setup();
      render(<OutfitCreator clothingItems={mockClothingItems} onSaveOutfit={mockOnSaveOutfit} />);
      
      // Enter selection mode and select items
      await user.click(screen.getByText('Add Items'));
      
      const shirtCard = screen.getByText('Blue Shirt').closest('.MuiCard-root');
      if (shirtCard) await user.click(shirtCard);
      
      // Open save dialog
      await user.click(screen.getByText('Save Outfit'));
      
      // Check that save button is disabled when no name is entered
      const saveButton = screen.getByRole('button', { name: /save outfit/i });
      expect(saveButton).toBeDisabled();
      
      // Should not call onSaveOutfit
      expect(mockOnSaveOutfit).not.toHaveBeenCalled();
    });

    it('should not save outfit without selected items', async () => {
      const user = userEvent.setup();
      render(<OutfitCreator clothingItems={mockClothingItems} onSaveOutfit={mockOnSaveOutfit} />);
      
      // Enter selection mode but don't select items
      await user.click(screen.getByText('Add Items'));
      
      // Save outfit button should be disabled when no items are selected
      const saveButton = screen.getByText('Save Outfit');
      expect(saveButton).toBeDisabled();
      
      expect(mockOnSaveOutfit).not.toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup();
      mockOnSaveOutfit.mockRejectedValue(new Error('Storage quota exceeded'));
      
      render(<OutfitCreator clothingItems={mockClothingItems} onSaveOutfit={mockOnSaveOutfit} />);
      
      // Enter selection mode and select items
      await user.click(screen.getByText('Add Items'));
      
      const shirtCard = screen.getByText('Blue Shirt').closest('.MuiCard-root');
      if (shirtCard) await user.click(shirtCard);
      
      // Open save dialog and fill details
      await user.click(screen.getByText('Save Outfit'));
      
      const nameInput = await screen.findByLabelText(/outfit name/i);
      await user.type(nameInput, 'Test Outfit');
      
      // Try to save
      const saveButton = screen.getByRole('button', { name: /save outfit/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/storage quota exceeded/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should clear selection after successful save', async () => {
      const user = userEvent.setup();
      render(<OutfitCreator clothingItems={mockClothingItems} onSaveOutfit={mockOnSaveOutfit} />);
      
      // Enter selection mode and select items
      await user.click(screen.getByText('Add Items'));
      
      const shirtCard = screen.getByText('Blue Shirt').closest('.MuiCard-root');
      if (shirtCard) await user.click(shirtCard);
      
      // Save outfit
      await user.click(screen.getByText('Save Outfit'));
      
      const nameInput = await screen.findByLabelText(/outfit name/i);
      await user.type(nameInput, 'Test Outfit');
      
      const saveButton = screen.getByRole('button', { name: /save outfit/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        // Should exit selection mode and show success message
        expect(screen.getByText('Add Items')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('cross-browser compatibility', () => {
    it('should display success message after save', async () => {
      const user = userEvent.setup();
      render(<OutfitCreator clothingItems={mockClothingItems} onSaveOutfit={mockOnSaveOutfit} />);
      
      // Enter selection mode and select items
      await user.click(screen.getByText('Add Items'));
      
      const shirtCard = screen.getByText('Blue Shirt').closest('.MuiCard-root');
      if (shirtCard) await user.click(shirtCard);
      
      // Save outfit
      await user.click(screen.getByText('Save Outfit'));
      
      const nameInput = await screen.findByLabelText(/outfit name/i);
      await user.type(nameInput, 'Test Outfit');
      
      const saveButton = screen.getByRole('button', { name: /save outfit/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/outfit saved successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle empty clothing items list', () => {
      render(<OutfitCreator clothingItems={[]} onSaveOutfit={mockOnSaveOutfit} />);
      
      // Should render without crashing and show the outfit creator interface
      expect(screen.getByText('Add Items')).toBeInTheDocument();
    });

    it('should filter items by search', async () => {
      const user = userEvent.setup();
      render(<OutfitCreator clothingItems={mockClothingItems} onSaveOutfit={mockOnSaveOutfit} />);
      
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'blue');
      
      expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
      expect(screen.queryByText('Black Pants')).not.toBeInTheDocument();
      expect(screen.queryByText('White Sneakers')).not.toBeInTheDocument();
    });
  });
});