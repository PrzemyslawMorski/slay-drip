import { useEffect, useState } from 'react';
import { en } from '../strings/en';
import type { WardrobeItem } from '../storage/localDb';

interface PhotoGridProps {
  items: WardrobeItem[];
}

// One object URL per photo. The URLs are revoked when the list changes or the grid unmounts.
export function PhotoGrid({ items }: PhotoGridProps) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const created = items.map((item) => URL.createObjectURL(item.photo));
    setUrls(created);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [items]);

  return (
    <ul className="photo-grid">
      {urls.map((url, index) => (
        <li key={items[index].id} className="photo-tile">
          <img src={url} alt={en.wardrobe.itemAlt(index + 1)} />
        </li>
      ))}
    </ul>
  );
}
