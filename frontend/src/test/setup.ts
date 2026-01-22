import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import React from 'react'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Mock MUI icons to prevent importing all icon files during tests
vi.mock('@mui/icons-material', () => ({
  Search: () => React.createElement('span', { 'data-testid': 'search-icon' }, 'Search'),
  Delete: () => React.createElement('span', { 'data-testid': 'delete-icon' }, 'Delete'),
  Favorite: () => React.createElement('span', { 'data-testid': 'favorite-icon' }, 'Favorite'),
  FavoriteBorder: () => React.createElement('span', { 'data-testid': 'favorite-border-icon' }, 'FavoriteBorder'),
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any
