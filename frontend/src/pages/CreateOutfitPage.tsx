import React, { useEffect } from 'react';
import OutfitCreator from '../components/OutfitCreator';
import { Outfit, WardrobeState } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { createOutfit, getItems } from '../api';

const CreateOutfitPage: React.FC = () => {
  const [wardrobeState, setWardrobeState] = useIndexedDB<WardrobeState>('wardrobeState', {
    clothingItems: [],
    outfits: [],
  });

  useEffect(() => {
    getItems()
      .then(items => {
        setWardrobeState(prev => ({
          ...prev,
          clothingItems: items.map(i => ({
            id: i.id,
            name: i.name,
            category: i.category as any,
            color: '',
            image: i.imageUrl,
            tags: [],
            dateAdded: i.created ?? '',
          })),
        }));
      })
      .catch(err => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveOutfit = async (newOutfit: Outfit) => {
    setWardrobeState(prev => ({
      ...prev,
      outfits: [...prev.outfits, newOutfit],
    }));

    // Persist to backend API
    await createOutfit({
      id: newOutfit.id,
      name: newOutfit.name,
      itemIds: newOutfit.items.map(i => i.id),
    });
  };

  return (
    <OutfitCreator
      clothingItems={wardrobeState.clothingItems}
      onSaveOutfit={handleSaveOutfit}
    />
  );
};

export default CreateOutfitPage;