import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Check if localStorage is available (iOS Safari private mode fix)
      if (typeof window === 'undefined' || !window.localStorage) {
        return initialValue;
      }
      
      // Test localStorage access
      const testKey = '__localStorage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage (possibly private mode):', error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      // Attempt to save to localStorage with retry logic
      const saveToStorage = () => {
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          return true;
        } catch (error) {
          console.error('Error saving to localStorage:', error);
          
          // If it's a quota exceeded error, try to free up space
          if (error instanceof DOMException && error.code === 22) {
            try {
              // Clear some old data and retry
              const keys = Object.keys(localStorage);
              const oldKeys = keys.filter(k => k.startsWith('old_') || k.includes('temp_'));
              oldKeys.forEach(k => localStorage.removeItem(k));
              
              // Retry save
              window.localStorage.setItem(key, JSON.stringify(valueToStore));
              return true;
            } catch (retryError) {
              console.error('Retry save failed:', retryError);
              throw new Error('Storage quota exceeded. Please free up space and try again.');
            }
          }
          throw error;
        }
      };

      if (!saveToStorage()) {
        throw new Error('Failed to save to local storage');
      }
    } catch (error) {
      console.error('Error in setValue:', error);
      throw error; // Re-throw to let components handle the error
    }
  }, [key, storedValue]);

  // Sync with localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Error parsing storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue] as const;
}