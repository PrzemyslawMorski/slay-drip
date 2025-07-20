import { useState, useEffect, useCallback } from 'react';
import { openDB } from 'idb';

/**
 * React hook that persists a single value in IndexedDB (key-value style).
 * It mirrors the API shape of the existing `useLocalStorage` hook so most
 * callers can be migrated by simply swapping the import.
 */
export function useIndexedDB<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  /* ---------- IndexedDB helpers ---------- */
  const dbPromise = openDB('wardrobe-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv');
      }
    },
  });

  const readFromDB = useCallback(async () => {
    try {
      const db = await dbPromise;
      const result = await db.get('kv', key);
      if (result !== undefined) {
        setStoredValue(result as T);
      }
    } catch (err) {
      console.error('IndexedDB read error', err);
    }
  }, [dbPromise, key]);

  const writeToDB = useCallback(async (valueToStore: T) => {
    try {
      const db = await dbPromise;
      await db.put('kv', valueToStore, key);
    } catch (err) {
      console.error('IndexedDB write error', err);
    }
  }, [dbPromise, key]);

  // Load on mount
  useEffect(() => {
    readFromDB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        writeToDB(valueToStore);
        return valueToStore;
      });
    },
    [writeToDB]
  );

  return [storedValue, setValue] as const;
}