export interface ApiItem {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  created?: string;
  updated?: string;
}

export interface ApiOutfit {
  id: string;
  name: string;
  itemIds: string[];
  created?: string;
  updated?: string;
}

const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

function withKey(headers: Record<string, string> = {}): HeadersInit {
  return API_KEY ? { ...headers, 'x-api-key': API_KEY } : headers;
}

export async function getItems(): Promise<ApiItem[]> {
  const res = await fetch(`${BASE_URL}/items`, {
    headers: withKey(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch items: ${res.status}`);
  }
  const data = await res.json();
  return data.data as ApiItem[];
}

export async function createItem(item: ApiItem): Promise<ApiItem> {
  const res = await fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: withKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    throw new Error(`Failed to create item: ${res.status}`);
  }
  const data = await res.json();
  return data.data as ApiItem;
}

export async function getOutfits(): Promise<ApiOutfit[]> {
  const res = await fetch(`${BASE_URL}/outfits`, {
    headers: withKey(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch outfits: ${res.status}`);
  }
  const data = await res.json();
  return data.data as ApiOutfit[];
}

export async function createOutfit(outfit: ApiOutfit): Promise<ApiOutfit> {
  const res = await fetch(`${BASE_URL}/outfits`, {
    method: 'POST',
    headers: withKey({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(outfit),
  });
  if (!res.ok) {
    throw new Error(`Failed to create outfit: ${res.status}`);
  }
  const data = await res.json();
  return data.data as ApiOutfit;
}
