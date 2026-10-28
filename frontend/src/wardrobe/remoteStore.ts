import { ApiError, apiFetch } from '../api/client';
import { CONSENT_WORDING_VERSION, type WardrobeItem } from '../storage/localDb';
import type { WardrobeStore } from './store';

// Wardrobe for a signed-in person. The server is the source of truth. Routes used:
//   GET    /consents/wardrobe-photos        consent record (404 when none was given)
//   PUT    /consents/wardrobe-photos        {granted, wordingVersion}; granted false deletes the photos
//   GET    /wardrobe/items                  [{id, number, addedAt}]
//   POST   /wardrobe/items                  multipart field "photo"
//   GET    /wardrobe/items/{id}/photo       image bytes
//   DELETE /wardrobe/items/{id}
const CONSENT_PATH = '/consents/wardrobe-photos';
const ITEMS_PATH = '/wardrobe/items';

interface ConsentResponse {
  granted: boolean;
}

interface ItemResponse {
  id: string;
  number: number;
  addedAt: string;
}

async function setRemoteConsent(granted: boolean): Promise<void> {
  await apiFetch(CONSENT_PATH, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ granted, wordingVersion: CONSENT_WORDING_VERSION }),
  });
}

export const accountWardrobeStore: WardrobeStore = {
  location: 'account',
  async isConsentGranted() {
    try {
      const response = await apiFetch(CONSENT_PATH);
      const consent = (await response.json()) as ConsentResponse;
      return consent.granted === true;
    } catch (caught) {
      // No consent record yet is not an error: consent is not granted.
      if (caught instanceof ApiError && caught.status === 404) {
        return false;
      }
      throw caught;
    }
  },
  setConsent: setRemoteConsent,
  async listItems(): Promise<WardrobeItem[]> {
    const response = await apiFetch(ITEMS_PATH);
    const items = (await response.json()) as ItemResponse[];
    return Promise.all(
      items.map(async (item) => {
        const photoResponse = await apiFetch(`${ITEMS_PATH}/${item.id}/photo`);
        return {
          id: item.id,
          number: item.number,
          addedAt: item.addedAt,
          photo: await photoResponse.blob(),
        };
      }),
    );
  },
  async addItem(photo: Blob) {
    const form = new FormData();
    form.append('photo', photo, 'photo.jpg');
    await apiFetch(ITEMS_PATH, { method: 'POST', body: form });
  },
  async deleteItem(id: string) {
    await apiFetch(`${ITEMS_PATH}/${id}`, { method: 'DELETE' });
    return [];
  },
  withdrawConsent: () => setRemoteConsent(false),
};
