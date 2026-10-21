import { useEffect, useRef, useState } from 'react';
import { en } from '../strings/en';
import { PhotoRejectedError, preparePhoto, type RejectionReason } from '../photos/preparePhoto';
import {
  addWardrobeItem,
  getWardrobeConsent,
  listWardrobeItems,
  setWardrobeConsent,
  withdrawWardrobeConsent,
  type WardrobeItem,
} from '../storage/localDb';
import { ConsentPanel } from './ConsentPanel';
import { PhotoGrid } from './PhotoGrid';

const ERROR_MESSAGES: Record<RejectionReason, string> = {
  unsupported: en.upload.unsupported,
  tooLarge: en.upload.tooLarge,
  unreadable: en.upload.unreadable,
};

export function WardrobeScreen() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [consentGranted, setConsentGranted] = useState(false);
  const [askingConsent, setAskingConsent] = useState(false);
  const [confirmingWithdrawal, setConfirmingWithdrawal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const consent = await getWardrobeConsent();
      setConsentGranted(consent?.granted === true);
      setItems(await listWardrobeItems());
    })();
  }, []);

  function handleAddClick() {
    setError(null);
    if (consentGranted) {
      fileInput.current?.click();
    } else {
      setAskingConsent(true);
    }
  }

  function handleAgree() {
    // The picker opens inside this click, so mobile browsers allow it.
    setConsentGranted(true);
    setAskingConsent(false);
    fileInput.current?.click();
    void setWardrobeConsent(true);
  }

  function handleDecline() {
    setAskingConsent(false);
    void setWardrobeConsent(false);
  }

  async function handleFilesChosen(files: File[]) {
    setError(null);
    try {
      for (const file of files) {
        const photo = await preparePhoto(file);
        await addWardrobeItem(photo);
      }
    } catch (caught) {
      if (caught instanceof PhotoRejectedError) {
        setError(ERROR_MESSAGES[caught.reason]);
      } else {
        setError(en.upload.saveFailed);
      }
    }
    setItems(await listWardrobeItems());
  }

  async function handleWithdraw() {
    await withdrawWardrobeConsent();
    setConsentGranted(false);
    setConfirmingWithdrawal(false);
    setItems([]);
  }

  return (
    <section aria-labelledby="wardrobe-heading" className="wardrobe">
      <h1 id="wardrobe-heading">{en.wardrobe.heading}</h1>
      <p className="item-count" aria-live="polite">
        {en.wardrobe.itemCount(items.length)}
      </p>

      <div className="button-row">
        <button type="button" className="button button-primary" onClick={handleAddClick}>
          {en.wardrobe.addPhotos}
        </button>
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

      {askingConsent && <ConsentPanel onAgree={handleAgree} onDecline={handleDecline} />}

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {items.length === 0 ? <p className="empty">{en.wardrobe.empty}</p> : <PhotoGrid items={items} />}

      <footer className="privacy">
        {confirmingWithdrawal ? (
          <div className="panel">
            <p>{en.wardrobe.withdrawConfirm}</p>
            <div className="button-row">
              <button type="button" className="button button-danger" onClick={handleWithdraw}>
                {en.wardrobe.withdrawYes}
              </button>
              <button type="button" className="button" onClick={() => setConfirmingWithdrawal(false)}>
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
