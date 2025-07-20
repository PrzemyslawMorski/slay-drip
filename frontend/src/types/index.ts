export interface ClothingItem {
  id: string;
  name: string;
  category: 'tops' | 'bottoms' | 'shoes' | 'accessories' | 'outerwear';
  color: string;
  brand?: string;
  image: string; // Base64 encoded image or URL
  tags: string[];
  dateAdded: string;
}

export interface Outfit {
  id: string;
  name: string;
  items: ClothingItem[];
  tags: string[];
  dateCreated: string;
  favorite: boolean;
}

export interface WardrobeState {
  clothingItems: ClothingItem[];
  outfits: Outfit[];
}