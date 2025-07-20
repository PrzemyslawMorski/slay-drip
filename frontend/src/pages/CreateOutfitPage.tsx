import React from 'react';
import OutfitCreator from '../components/OutfitCreator';
import { Outfit, WardrobeState } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

const CreateOutfitPage: React.FC = () => {
  const [wardrobeState, setWardrobeState] = useLocalStorage<WardrobeState>('wardrobeState', {
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