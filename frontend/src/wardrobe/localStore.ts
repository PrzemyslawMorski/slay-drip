import {
  addWardrobeItem,
  deleteWardrobeItem,
  getWardrobeConsent,
  listWardrobeItems,
  setWardrobeConsent,
  withdrawWardrobeConsent,
} from '../storage/localDb';
import type { WardrobeStore } from './store';

// Anonymous wardrobe on this device only (ADR-0004). Nothing here is sent to the server.
export const deviceWardrobeStore: WardrobeStore = {
  location: 'device',
  async isConsentGranted() {
    return (await getWardrobeConsent())?.granted === true;
  },
  setConsent: setWardrobeConsent,
  listItems: listWardrobeItems,
  addItem: addWardrobeItem,
  deleteItem: deleteWardrobeItem,
  withdrawConsent: withdrawWardrobeConsent,
};
