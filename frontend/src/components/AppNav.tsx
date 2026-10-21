import { en } from '../strings/en';

interface AppNavProps {
  current: 'wardrobe' | 'outfits';
  onWardrobe: () => void;
  onOutfits: () => void;
}

export function AppNav({ current, onWardrobe, onOutfits }: AppNavProps) {
  return (
    <nav aria-label={en.nav.label} className="button-row">
      <button
        type="button"
        className="button"
        aria-current={current === 'wardrobe' ? 'page' : undefined}
        onClick={onWardrobe}
      >
        {en.nav.wardrobe}
      </button>
      <button
        type="button"
        className="button"
        aria-current={current === 'outfits' ? 'page' : undefined}
        onClick={onOutfits}
      >
        {en.nav.outfits}
      </button>
    </nav>
  );
}
