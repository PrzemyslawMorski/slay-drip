import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Layout from '../Layout'

// Mock useNavigate and useLocation
const mockNavigate = vi.fn()
const mockLocation = { pathname: '/' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  }
})

const theme = createTheme()

const renderWithProviders = (ui: React.ReactElement, initialPath = '/') => {
  mockLocation.pathname = initialPath
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {ui}
      </ThemeProvider>
    </BrowserRouter>
  )
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.pathname = '/'
  })

  it('renders the app title', () => {
    renderWithProviders(<Layout><div>Test Content</div></Layout>)
    expect(screen.getByText('✨ Slay Drip')).toBeInTheDocument()
  })

  it('renders all navigation tabs', () => {
    renderWithProviders(<Layout><div>Test Content</div></Layout>)
    expect(screen.getByText('Wardrobe')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('Create Outfit')).toBeInTheDocument()
    expect(screen.getByText('My Outfits')).toBeInTheDocument()
  })

  it('renders children content', () => {
    renderWithProviders(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    )
    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('highlights the active tab based on current path', () => {
    renderWithProviders(
      <Layout><div>Test</div></Layout>,
      '/upload'
    )
    const uploadTab = screen.getByText('Upload').closest('button')
    expect(uploadTab).toHaveAttribute('aria-selected', 'true')
  })
})
