import { useMemo, useSyncExternalStore } from 'react';
import type { WardrobeItem } from '../storage/localDb';
import { createObjectUrlStore } from './objectUrlStore';

export function useObjectUrls(items: WardrobeItem[]): string[] {
  const store = useMemo(() => createObjectUrlStore(items), [items]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
