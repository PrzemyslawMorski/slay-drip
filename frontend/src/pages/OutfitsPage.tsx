import React, { useEffect } from 'react';
import OutfitGallery from '../components/OutfitGallery';
import { Outfit, WardrobeState } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { getOutfits, getItems } from '../api';

const OutfitsPage: React.FC = () => {
  const [wardrobeState, setWardrobeState] = useIndexedDB<WardrobeState>('wardrobeState', {
    clothingItems: [],
    outfits: [],
  });

  // Load outfits and related items from backend on mount
  useEffect(() => {
    Promise.all([getOutfits(), getItems()])
      .then(([outfits, items]) => {
        const itemMap = new Map(
          items.map(i => [i.id, i])
        );

        setWardrobeState(prev => ({
          ...prev,
          outfits: outfits.map(o => ({
            id: o.id,
            name: o.name,
            items: o.itemIds.map(id => {
              const it = itemMap.get(id);
              return it
                ? {
                    id: it.id,
                    name: it.name,
                    category: it.category as any,
                    color: '',
                    image: it.imageUrl,
                    tags: [],
                    dateAdded: it.created ?? '',
                  }
                : { id, name: id, category: 'tops' as any, color: '', image: '', tags: [], dateAdded: '' };
            }),
            tags: [],
            dateCreated: o.created ?? '',
            favorite: false,
          })),
        }));
      })
      .catch(err => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOutfitUpdate = (updatedOutfit: Outfit) => {
    setWardrobeState(prev => ({
      ...prev,
      outfits: prev.outfits.map(outfit =>
        outfit.id === updatedOutfit.id ? updatedOutfit : outfit
      ),
    }));
  };

  const handleOutfitDelete = (outfitId: string) => {
    setWardrobeState(prev => ({
      ...prev,
      outfits: prev.outfits.filter(outfit => outfit.id !== outfitId),
    }));
  };

  return (
    <OutfitGallery
      outfits={wardrobeState.outfits}
      onOutfitUpdate={handleOutfitUpdate}
      onOutfitDelete={handleOutfitDelete}
    />
  );
};

export default OutfitsPage;