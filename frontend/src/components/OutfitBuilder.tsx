import { useEffect, useState } from 'react';
import { en } from '../strings/en';
import { useObjectUrls } from '../photos/useObjectUrls';
import { listOutfits, listWardrobeItems, saveOutfit, type WardrobeItem } from '../storage/localDb';

const MAX_NAME_LENGTH = 60;

interface OutfitBuilderProps {
  // Set when editing a saved outfit. Unset when creating one.
  outfitId?: string;
  onDone: () => void;
}

export function OutfitBuilder({ outfitId, onDone }: OutfitBuilderProps) {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const urls = useObjectUrls(items);

  useEffect(() => {
    void (async () => {
      const [loadedItems, outfits] = await Promise.all([listWardrobeItems(), listOutfits()]);
      const existing = outfits.find((outfit) => outfit.id === outfitId);
      setItems(loadedItems);
      if (existing) {
        setName(existing.name);
        setSelectedIds(existing.itemIds.filter((id) => loadedItems.some((item) => item.id === id)));
      }
    })();
  }, [outfitId]);

  const itemsById = new Map(items.map((item) => [item.id, item]));

  function toggleItem(id: string) {
    setError(null);
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }

  async function handleSave() {
    if (selectedIds.length === 0) {
      setError(en.builder.needItem);
      return;
    }
    const trimmed = name.trim();
    if ([...trimmed].length > MAX_NAME_LENGTH) {
      setError(en.builder.nameTooLong);
      return;
    }
    const finalName = trimmed || en.builder.defaultName((await listOutfits()).length + 1);
    await saveOutfit({ id: outfitId ?? crypto.randomUUID(), name: finalName, itemIds: selectedIds });
    onDone();
  }

  return (
    <section aria-labelledby="builder-heading" className="builder">
      <h1 id="builder-heading">{outfitId ? en.builder.editHeading : en.builder.newHeading}</h1>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <h2 id="pick-heading">{en.builder.pickHeading}</h2>
      <ul className="photo-grid" aria-labelledby="pick-heading">
        {items.map((item, index) => {
          const selected = selectedIds.includes(item.id);
          return (
            <li key={item.id} className="photo-tile">
              <button
                type="button"
                className={selected ? 'choice choice-selected' : 'choice'}
                aria-pressed={selected}
                onClick={() => toggleItem(item.id)}
              >
                <img src={urls[index]} alt={en.wardrobe.itemAlt(item.number)} />
              </button>
            </li>
          );
        })}
      </ul>

      <h2 id="preview-heading">{en.builder.previewHeading}</h2>
      {selectedIds.length === 0 && <p className="empty">{en.builder.previewEmpty}</p>}
      <ol className="outfit-items" aria-labelledby="preview-heading">
        {selectedIds.map((id) => {
          const item = itemsById.get(id);
          return item ? <li key={id}>{en.wardrobe.itemAlt(item.number)}</li> : null;
        })}
      </ol>

      <div className="field">
        <label htmlFor="outfit-name">{en.builder.nameLabel}</label>
        <input id="outfit-name" type="text" value={name} aria-describedby="outfit-name-hint" onChange={(event) => setName(event.target.value)} />
        <p id="outfit-name-hint" className="hint">
          {en.builder.nameHint}
        </p>
      </div>

      <div className="button-row">
        <button
          type="button"
          className="button button-primary"
          aria-disabled={selectedIds.length === 0}
          onClick={handleSave}
        >
          {en.builder.save}
        </button>
        <button type="button" className="button" onClick={onDone}>
          {en.builder.cancel}
        </button>
      </div>
    </section>
  );
}
