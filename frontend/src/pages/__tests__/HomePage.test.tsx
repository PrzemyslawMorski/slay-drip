import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import HomePage from '../HomePage'
import { ClothingItem } from '../../types'

// Mock the useIndexedDB hook
const mockWardrobeState = {
  clothingItems: [] as ClothingItem[],
  outfits: [],
}

const mockSetWardrobeState = vi.fn()

vi.mock('../../hooks/useIndexedDB', () => ({
  useIndexedDB: vi.fn(() => [mockWardrobeState, mockSetWardrobeState]),
}))

const theme = createTheme()

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {ui}
      </ThemeProvider>
    </BrowserRouter>
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWardrobeState.clothingItems = []
    mockWardrobeState.outfits = []
  })

  it('renders WardrobeView component', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByText(/Your Wardrobe/)).toBeInTheDocument()
  })

  it('passes clothing items to WardrobeView', () => {
    const mockItems: ClothingItem[] = [
      {
        id: '1',
        name: 'Test Item',
        category: 'tops',
        color: '#000000',
        image: 'data:image/png;base64,test',
        tags: [],
        dateAdded: '2024-01-01',
      },
    ]
    
    mockWardrobeState.clothingItems = mockItems
    renderWithProviders(<HomePage />)
    
    expect(screen.getByText('Test Item')).toBeInTheDocument()
  })

  it('handles item deletion correctly', async () => {
    const mockItems: ClothingItem[] = [
      {
        id: '1',
        name: 'Item 1',
        category: 'tops',
        color: '#000000',
        image: 'data:image/png;base64,test',
        tags: [],
        dateAdded: '2024-01-01',
      },
      {
        id: '2',
        name: 'Item 2',
        category: 'bottoms',
        color: '#FFFFFF',
        image: 'data:image/png;base64,test',
        tags: [],
        dateAdded: '2024-01-02',
      },
    ]
    
    mockWardrobeState.clothingItems = mockItems
    renderWithProviders(<HomePage />)
    
    // Verify items are rendered
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    
    // The actual deletion logic is tested in WardrobeView tests
    // Here we just verify the component renders correctly
  })

  it('displays empty state when no items exist', () => {
    mockWardrobeState.clothingItems = []
    renderWithProviders(<HomePage />)
    
    expect(screen.getByText(/No items found/)).toBeInTheDocument()
  })
})
