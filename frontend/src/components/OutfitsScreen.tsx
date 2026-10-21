import { useEffect, useState } from 'react';
import { en } from '../strings/en';
import { deleteOutfit, listOutfits, listWardrobeItems, type Outfit, type WardrobeItem } from '../storage/localDb';
import { AppNav } from './AppNav';

interface OutfitsScreenProps {
  onOpenWardrobe: () => void;
  onCreateOutfit: () => void;
  onEditOutfit: (outfitId: string) => void;
}

export function OutfitsScreen({ onOpenWardrobe, onCreateOutfit, onEditOutfit }: OutfitsScreenProps) {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [outfitToDelete, setOutfitToDelete] = useState<Outfit | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setOutfits(await listOutfits());
    setItems(await listWardrobeItems());
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleCreateClick() {
    setError(null);
    if ((await listWardrobeItems()).length === 0) {
      setError(en.outfits.needPhotos);
      return;
    }
    onCreateOutfit();
  }

  async function handleConfirmDelete() {
    if (!outfitToDelete) {
      return;
    }
    await deleteOutfit(outfitToDelete.id);
    setOutfitToDelete(null);
    await reload();
  }

  const itemNumbers = new Map(items.map((item) => [item.id, item.number]));

  return (
    <section aria-labelledby="outfits-heading" className="outfits">
      <h1 id="outfits-heading">{en.outfits.heading}</h1>
      <AppNav current="outfits" onWardrobe={onOpenWardrobe} onOutfits={() => undefined} />

      <div className="button-row">
        <button type="button" className="button button-primary" onClick={handleCreateClick}>
          {en.outfits.create}
        </button>
      </div>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {outfits.length === 0 ? (
        <p className="empty">{en.outfits.empty}</p>
      ) : (
        <ul className="outfit-list">
          {outfits.map((outfit) => {
            const names = outfit.itemIds
              .map((id) => itemNumbers.get(id))
              .filter((number): number is number => number !== undefined)
              .map((number) => en.wardrobe.itemAlt(number));
            return (
              <li key={outfit.id} className="outfit-card">
                <h2>
                  <button type="button" className="outfit-name" onClick={() => onEditOutfit(outfit.id)}>
                    {outfit.name}
                  </button>
                </h2>
                <ul aria-label={en.outfits.itemsLabel(outfit.name)} className="outfit-items">
                  {names.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="button button-small"
                  aria-label={en.outfits.deleteLabel(outfit.name)}
                  onClick={() => setOutfitToDelete(outfit)}
                >
                  {en.outfits.delete}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {outfitToDelete && (
        <section aria-labelledby="delete-outfit-heading" className="panel">
          <h2 id="delete-outfit-heading">{en.outfits.deleteHeading(outfitToDelete.name)}</h2>
          <p>{en.outfits.deleteBody}</p>
          <div className="button-row">
            <button type="button" className="button button-danger" onClick={handleConfirmDelete}>
              {en.outfits.deleteYes}
            </button>
            <button type="button" className="button" onClick={() => setOutfitToDelete(null)}>
              {en.wardrobe.cancel}
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
