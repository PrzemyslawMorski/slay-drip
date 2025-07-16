import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock service worker registration
vi.mock('./serviceWorkerRegistration', () => ({
  default: {
    register: vi.fn(),
    unregister: vi.fn(),
  },
})) 