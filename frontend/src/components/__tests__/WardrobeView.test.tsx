import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import WardrobeView from '../WardrobeView'
import { ClothingItem } from '../../types'

const theme = createTheme()

const mockItems: ClothingItem[] = [
  {
    id: '1',
    name: 'Blue Jeans',
    category: 'bottoms',
    color: '#0000FF',
    brand: 'Levi\'s',
    image: 'data:image/png;base64,test',
    tags: ['casual', 'denim'],
    dateAdded: '2024-01-01',
  },
  {
    id: '2',
    name: 'White T-Shirt',
    category: 'tops',
    color: '#FFFFFF',
    image: 'data:image/png;base64,test',
    tags: ['casual'],
    dateAdded: '2024-01-02',
  },
  {
    id: '3',
    name: 'Red Dress',
    category: 'dress',
    color: '#FF0000',
    brand: 'Zara',
    image: 'data:image/png;base64,test',
    tags: ['formal', 'elegant'],
    dateAdded: '2024-01-03',
  },
]

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  )
}

describe('WardrobeView', () => {
  const mockOnItemDelete = vi.fn()
  const mockOnItemsSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the wardrobe title with item count', () => {
    renderWithTheme(
      <WardrobeView items={mockItems} onItemDelete={mockOnItemDelete} />
    )
    expect(screen.getByText(/Your Wardrobe \(3 items\)/)).toBeInTheDocument()
  })

  it('displays all items when rendered', () => {
    renderWithTheme(
      <WardrobeView items={mockItems} onItemDelete={mockOnItemDelete} />
    )
    expect(screen.getByText('Blue Jeans')).toBeInTheDocument()
    expect(screen.getByText('White T-Shirt')).toBeInTheDocument()
    expect(screen.getByText('Red Dress')).toBeInTheDocument()
  })

  it('displays item categories', () => {
    renderWithTheme(
      <WardrobeView items={mockItems} onItemDelete={mockOnItemDelete} />
    )
    const categoryChips = screen.getAllByText('bottoms')
    expect(categoryChips.length).toBeGreaterThan(0)
  })

  it('displays item brands when available', () => {
    renderWithTheme(
      <WardrobeView items={mockItems} onItemDelete={mockOnItemDelete} />
    )
    expect(screen.getByText('Levi\'s')).toBeInTheDocument()
    expect(screen.getByText('Zara')).toBeInTheDocument()
  })

  it('filters items by search term', async () => {
    renderWithTheme(
      <WardrobeView items={mockItems} onItemDelete={mockOnItemDelete} />
    )
    
    const searchInput = screen.getByPlaceholderText(/Search by name, brand, color/)
    fireEvent.change(searchInput, { target: { value: 'Blue' } })

    await waitFor(() => {
      expect(screen.getByText('Blue Jeans')).toBeInTheDocument()
      expect(screen.queryByText('White T-Shirt')).not.toBeInTheDocument()
      expect(screen.queryByText('Red Dress')).not.toBeInTheDocument()
    })
  })

  it('filters items by category', async () => {
    renderWithTheme(
      <WardrobeView items={mockItems} onItemDelete={mockOnItemDelete} />
    )
    
    const topsTab = screen.getByText(/Tops/)
    fireEvent.click(topsTab)

    await waitFor(() => {
      expect(screen.getByText('White T-Shirt')).toBeInTheDocument()
      expect(screen.queryByText('Blue Jeans')).not.toBeInTheDocument()
      expect(screen.queryByText('Red Dress')).not.toBeInTheDocument()
    })
  })

  it('calls onItemDelete when delete button is clicked', async () => {
    renderWithTheme(
      <WardrobeView items={mockItems} onItemDelete={mockOnItemDelete} />
    )
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(mockOnItemDelete).toHaveBeenCalledWith('1')
    })
  })

  it('displays empty state when no items match filter', async () => {
    renderWithTheme(
      <WardrobeView items={mockItems} onItemDelete={mockOnItemDelete} />
    )
    
    const searchInput = screen.getByPlaceholderText(/Search by name, brand, color/)
    fireEvent.change(searchInput, { target: { value: 'NonExistentItem' } })

    await waitFor(() => {
      expect(screen.getByText('No items found')).toBeInTheDocument()
      expect(screen.getByText(/Try adjusting your search terms/)).toBeInTheDocument()
    })
  })

  it('displays empty state when items array is empty', () => {
    renderWithTheme(
      <WardrobeView items={[]} onItemDelete={mockOnItemDelete} />
    )
    expect(screen.getByText('No items found')).toBeInTheDocument()
    expect(screen.getByText(/Start by uploading some clothing items/)).toBeInTheDocument()
  })

  describe('Selection Mode', () => {
    it('shows checkboxes when selectionMode is enabled', () => {
      renderWithTheme(
        <WardrobeView
          items={mockItems}
          selectionMode={true}
          onItemsSelect={mockOnItemsSelect}
        />
      )
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)
    })

    it('calls onItemsSelect when item is clicked in selection mode', async () => {
      renderWithTheme(
        <WardrobeView
          items={mockItems}
          selectionMode={true}
          onItemsSelect={mockOnItemsSelect}
        />
      )
      
      // Find the Card element containing the item name
      const itemName = screen.getByText('Blue Jeans')
      const cardElement = itemName.closest('div[class*="MuiCard"]')
      
      if (cardElement) {
        fireEvent.click(cardElement)
      }

      await waitFor(() => {
        expect(mockOnItemsSelect).toHaveBeenCalled()
      })
    })

    it('highlights selected items', () => {
      const selectedItems = [mockItems[0]]
      renderWithTheme(
        <WardrobeView
          items={mockItems}
          selectionMode={true}
          selectedItems={selectedItems}
          onItemsSelect={mockOnItemsSelect}
        />
      )
      
      const firstItemCard = screen.getByText('Blue Jeans').closest('div[class*="MuiCard"]')
      expect(firstItemCard).toHaveStyle({ border: expect.stringContaining('2px solid') })
    })
  })

  describe('Search functionality', () => {
    it('searches by item name', async () => {
      renderWithTheme(
        <WardrobeView items={mockItems} onItemDelete={mockOnItemDelete} />
      )
      
      const searchInput = screen.getByPlaceholderText(/Search by name, brand, color/)
      fireEvent.change(searchInput, { target: { value: 'Dress' } })

      await waitFor(() => {
        expect(screen.getByText('Red Dress')).toBeInTheDocument()
        expect(screen.queryByText('Blue Jeans')).not.toBeInTheDocument()
      })
    })

    it('searches by brand', async () => {
      renderWithTheme(
        <WardrobeView items={mockItems} onItemDelete={mockOnItemDelete} />
      )
      
      const searchInput = screen.getByPlaceholderText(/Search by name, brand, color/)
      fireEvent.change(searchInput, { target: { value: 'Zara' } })

      await waitFor(() => {
        expect(screen.getByText('Red Dress')).toBeInTheDocument()
        expect(screen.queryByText('Blue Jeans')).not.toBeInTheDocument()
      })
    })

    it('searches by tags', async () => {
      renderWithTheme(
        <WardrobeView items={mockItems} onItemDelete={mockOnItemDelete} />
      )
      
      const searchInput = screen.getByPlaceholderText(/Search by name, brand, color/)
      fireEvent.change(searchInput, { target: { value: 'denim' } })

      await waitFor(() => {
        expect(screen.getByText('Blue Jeans')).toBeInTheDocument()
        expect(screen.queryByText('White T-Shirt')).not.toBeInTheDocument()
      })
    })
  })
})
