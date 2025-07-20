import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    expect(result.current[0]).toBe('initial');
  });

  it('should return stored value from localStorage', () => {
    const testValue = { items: ['item1', 'item2'] };
    localStorageMock.setItem('test-key', JSON.stringify(testValue));
    
    const { result } = renderHook(() => useLocalStorage('test-key', {}));
    
    expect(result.current[0]).toEqual(testValue);
  });

  it('should save value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', ''));
    
    act(() => {
      result.current[1]('new value');
    });
    
    expect(result.current[0]).toBe('new value');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', '"new value"');
  });

  it('should handle localStorage quota exceeded error', () => {
    localStorageMock.clear();
    
    // Mock quota exceeded error
    localStorageMock.setItem.mockImplementation(() => {
      const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
      Object.defineProperty(error, 'code', { value: 22, writable: false });
      throw error;
    });

    const { result } = renderHook(() => useLocalStorage('test-key', ''));
    
    expect(() => {
      act(() => {
        result.current[1]('large value');
      });
    }).toThrow(/Storage quota exceeded/);
  });

  it('should handle localStorage access denied in private mode', () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    
    // Mock access denied error - suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorageMock.setItem.mockImplementation(() => {
      const error = new Error('localStorage access denied');
      throw error;
    });

    const { result } = renderHook(() => useLocalStorage('test-key', ''));
    
    // The hook should handle the error gracefully and not crash
    act(() => {
      result.current[1]('some value');
    });
    
    // Value should remain unchanged due to error
    expect(result.current[0]).toBe('');
    expect(localStorageMock.setItem).toHaveBeenCalled();
    
    // Restore console
    consoleSpy.mockRestore();
  });

  it('should handle JSON parse errors gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid json');
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    
    expect(result.current[0]).toBe('default');
  });

  it('should work with function updates', () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    
    // Reset setItem to normal behavior
    localStorageMock.setItem.mockImplementation((key, value) => {
      localStorageMock[key] = value;
    });
    
    const { result } = renderHook(() => useLocalStorage('test-key', 0));
    
    act(() => {
      result.current[1](prev => prev + 1);
    });
    
    expect(result.current[0]).toBe(1);
  });

  it('should handle complex objects', () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    
    // Reset setItem to normal behavior
    localStorageMock.setItem.mockImplementation((key, value) => {
      localStorageMock[key] = value;
    });
    
    const complexObject = {
      clothingItems: [
        { id: '1', name: 'Test Item', category: 'tops', color: 'blue', tags: ['casual'] }
      ],
      outfits: []
    };

    const { result } = renderHook(() => useLocalStorage('wardrobe', { clothingItems: [], outfits: [] }));
    
    act(() => {
      result.current[1](complexObject);
    });
    
    expect(result.current[0]).toEqual(complexObject);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('wardrobe', JSON.stringify(complexObject));
  });
});