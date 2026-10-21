import { useEffect, useState } from 'react';
import type { WardrobeItem } from '../storage/localDb';

// One object URL per photo, in the same order as the items. The URLs are revoked when the list changes or the caller unmounts.
export function useObjectUrls(items: WardrobeItem[]): string[] {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const created = items.map((item) => URL.createObjectURL(item.photo));
    setUrls(created);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [items]);

  return urls;
}
