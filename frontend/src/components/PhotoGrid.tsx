import { en } from '../strings/en';
import { useObjectUrls } from '../photos/useObjectUrls';
import type { WardrobeItem } from '../storage/localDb';

interface PhotoGridProps {
  items: WardrobeItem[];
  onDelete: (item: WardrobeItem) => void;
}

export function PhotoGrid({ items, onDelete }: PhotoGridProps) {
  const urls = useObjectUrls(items);

  return (
    <ul className="photo-grid">
      {items.map((item, index) => (
        <li key={item.id} className="photo-tile">
          <img src={urls[index]} alt={en.wardrobe.itemAlt(item.number)} />
          <button
            type="button"
            className="button button-small"
            aria-label={en.wardrobe.deleteItemLabel(item.number)}
            onClick={() => onDelete(item)}
          >
            {en.wardrobe.delete}
          </button>
        </li>
      ))}
    </ul>
  );
}
