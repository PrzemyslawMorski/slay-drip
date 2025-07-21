import React from 'react';
import OutfitGallery from '../components/OutfitGallery';
import { Outfit, WardrobeState } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';

const OutfitsPage: React.FC = () => {
  const [wardrobeState, setWardrobeState] = useIndexedDB<WardrobeState>('wardrobeState', {
    clothingItems: [],
    outfits: [],
  });

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