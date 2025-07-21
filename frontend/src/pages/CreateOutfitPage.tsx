import React from 'react';
import OutfitCreator from '../components/OutfitCreator';
import { Outfit, WardrobeState } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';

const CreateOutfitPage: React.FC = () => {
  const [wardrobeState, setWardrobeState] = useIndexedDB<WardrobeState>('wardrobeState', {
    clothingItems: [],
    outfits: [],
  });

  const handleSaveOutfit = (newOutfit: Outfit) => {
    setWardrobeState(prev => ({
      ...prev,
      outfits: [...prev.outfits, newOutfit],
    }));
  };

  return (
    <OutfitCreator
      clothingItems={wardrobeState.clothingItems}
      onSaveOutfit={handleSaveOutfit}
    />
  );
};

export default CreateOutfitPage;