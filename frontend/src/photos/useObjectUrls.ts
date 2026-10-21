import { useMemo, useSyncExternalStore } from 'react';
import type { WardrobeItem } from '../storage/localDb';

// One object URL per photo, in the same order as the items.
// The URLs are created when a component subscribes and revoked when it unsubscribes. StrictMode subscribes twice on mount, so the URLs are created again after the first revoke.
function createObjectUrlStore(items: WardrobeItem[]) {
  let urls: string[] = [];

  const subscribe = (onChange: () => void) => {
    urls = items.map((item) => URL.createObjectURL(item.photo));
    onChange();
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls = [];
    };
  };

  return { subscribe, getSnapshot: () => urls };
}

export function useObjectUrls(items: WardrobeItem[]): string[] {
  const store = useMemo(() => createObjectUrlStore(items), [items]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
