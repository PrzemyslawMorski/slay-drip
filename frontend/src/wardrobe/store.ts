import type { WardrobeItem } from '../storage/localDb';

// Where the wardrobe lives. 'device' is the anonymous path (ADR-0004): photos stay in IndexedDB and are never uploaded.
// 'account' is the signed-in path: the server holds the photos and the consent record.
export type WardrobeLocation = 'device' | 'account';

export interface WardrobeStore {
  readonly location: WardrobeLocation;
  isConsentGranted(): Promise<boolean>;
  setConsent(granted: boolean): Promise<void>;
  listItems(): Promise<WardrobeItem[]>;
  addItem(photo: Blob): Promise<void>;
  // Returns the names of outfits that were deleted with the item. Only the device store has outfits.
  deleteItem(id: string): Promise<string[]>;
  // Withdrawing consent deletes the photos in this store.
  withdrawConsent(): Promise<void>;
}
