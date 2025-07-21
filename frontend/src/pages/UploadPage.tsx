import React from 'react';
import ClothingUpload from '../components/ClothingUpload';
import { ClothingItem, WardrobeState } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';

const UploadPage: React.FC = () => {
  const [wardrobeState, setWardrobeState] = useIndexedDB<WardrobeState>('wardrobeState', {
    clothingItems: [],
    outfits: [],
  });

  const handleSaveItems = (newItems: ClothingItem[]) => {
    setWardrobeState(prev => ({
      ...prev,
      clothingItems: [...prev.clothingItems, ...newItems],
    }));
  };

  return <ClothingUpload onSave={handleSaveItems} />;
};

export default UploadPage;