import { useEffect, useRef, useState } from 'react';
import { en } from '../strings/en';
import { PhotoRejectedError, preparePhoto, type RejectionReason } from '../photos/preparePhoto';
import type { WardrobeItem } from '../storage/localDb';
import type { WardrobeStore } from '../wardrobe/store';
import { AppNav } from './AppNav';
import { ConsentPanel } from './ConsentPanel';
import { PhotoGrid } from './PhotoGrid';

const ERROR_MESSAGES: Record<RejectionReason, string> = {
  unsupported: en.upload.unsupported,
  tooLarge: en.upload.tooLarge,
  unreadable: en.upload.unreadable,
};

interface WardrobeScreenProps {
  store: WardrobeStore;
  onOpenOutfits?: () => void;
  onCreateOutfit?: () => void;
}

export function WardrobeScreen({ store, onOpenOutfits, onCreateOutfit }: WardrobeScreenProps) {
  // Outfits are device-only for now: their item ids point at the on-device wardrobe.
  const onDevice = store.location === 'device';
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [consentGranted, setConsentGranted] = useState(false);
  const [askingConsent, setAskingConsent] = useState(false);
  const [confirmingWithdrawal, setConfirmingWithdrawal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<WardrobeItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        setConsentGranted(await store.isConsentGranted());
        setItems(await store.listItems());
      } catch {
        // Fail closed: without a readable consent record, consent is not granted.
        setConsentGranted(false);
        setLoadFailed(true);
        setError(en.wardrobe.loadFailed);
      }
    })();
  }, [store]);

  function handleAddClick() {
    setError(null);
    setNotice(null);
    if (consentGranted) {
      fileInput.current?.click();
    } else {
      setAskingConsent(true);
    }
  }

  function handleCreateClick() {
    setError(null);
    setNotice(null);
    if (items.length === 0) {
      setError(en.outfits.needPhotos);
      return;
    }
    onCreateOutfit?.();
  }

  async function handleAgree() {
    // The picker opens inside this click, so mobile browsers allow it.
    setConsentGranted(true);
    setAskingConsent(false);
    fileInput.current?.click();
    await store.setConsent(true);
  }

  async function handleDecline() {
    setAskingConsent(false);
    await store.setConsent(false);
  }

  async function handleFilesChosen(files: File[]) {
    setError(null);
    try {
      for (const file of files) {
        const photo = await preparePhoto(file);
        await store.addItem(photo);
      }
    } catch (caught) {
      if (caught instanceof PhotoRejectedError) {
        setError(ERROR_MESSAGES[caught.reason]);
      } else {
        setError(en.upload.saveFailed);
      }
    }
    setItems(await store.listItems());
  }

  async function handleConfirmItemDelete() {
    if (!itemToDelete) {
      return;
    }
    const deletedOutfitNames = await store.deleteItem(itemToDelete.id);
    setItemToDelete(null);
    setNotice(deletedOutfitNames.map((name) => en.wardrobe.outfitDeleted(name)).join(' ') || null);
    setItems(await store.listItems());
  }

  async function handleWithdraw() {
    await store.withdrawConsent();
    setConsentGranted(false);
    setConfirmingWithdrawal(false);
    setNotice(null);
    setItems([]);
  }

  return (
    <section aria-labelledby="wardrobe-heading" className="wardrobe">
      <h1 id="wardrobe-heading">{en.wardrobe.heading}</h1>
      {onDevice && onOpenOutfits && (
        <AppNav current="wardrobe" onWardrobe={() => undefined} onOutfits={onOpenOutfits} />
      )}

      <p className="item-count" aria-live="polite">
        {en.wardrobe.itemCount(items.length)}
      </p>

      <div className="button-row">
        <button
          type="button"
          className="button button-primary"
          onClick={handleAddClick}
          disabled={loadFailed}
        >
          {en.wardrobe.addPhotos}
        </button>
        {onDevice && (
          <button
            type="button"
            className="button"
            onClick={handleCreateClick}
            disabled={loadFailed}
          >
            {en.outfits.create}
          </button>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (files.length > 0) {
            void handleFilesChosen(files);
          }
        }}
      />

      {askingConsent && (
        <ConsentPanel
          heading={onDevice ? en.consent.heading : en.consent.accountHeading}
          body={onDevice ? en.consent.body : en.consent.accountBody}
          onAgree={handleAgree}
          onDecline={handleDecline}
        />
      )}

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      {items.length === 0 ? (
        <p className="empty">{en.wardrobe.empty}</p>
      ) : (
        <PhotoGrid items={items} onDelete={setItemToDelete} />
      )}

      {itemToDelete && (
        <section aria-labelledby="delete-item-heading" className="panel">
          <h2 id="delete-item-heading">{en.wardrobe.deleteItemHeading(itemToDelete.number)}</h2>
          <p>{en.wardrobe.deleteItemBody}</p>
          <div className="button-row">
            <button
              type="button"
              className="button button-danger"
              onClick={handleConfirmItemDelete}
            >
              {en.wardrobe.deleteItemYes}
            </button>
            <button type="button" className="button" onClick={() => setItemToDelete(null)}>
              {en.wardrobe.cancel}
            </button>
          </div>
        </section>
      )}

      <footer className="privacy">
        {confirmingWithdrawal ? (
          <div className="panel">
            <p>{onDevice ? en.wardrobe.withdrawConfirm : en.wardrobe.withdrawConfirmAccount}</p>
            <div className="button-row">
              <button type="button" className="button button-danger" onClick={handleWithdraw}>
                {en.wardrobe.withdrawYes}
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setConfirmingWithdrawal(false)}
              >
                {en.wardrobe.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="button" onClick={() => setConfirmingWithdrawal(true)}>
            {en.wardrobe.withdraw}
          </button>
        )}
      </footer>
    </section>
  );
}
