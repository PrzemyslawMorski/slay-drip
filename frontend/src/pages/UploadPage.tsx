import React from 'react';
import ClothingUpload from '../components/ClothingUpload';
import { ClothingItem, WardrobeState } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { createItem } from '../api';

const UploadPage: React.FC = () => {
  const [wardrobeState, setWardrobeState] = useIndexedDB<WardrobeState>('wardrobeState', {
    clothingItems: [],
    outfits: [],
  });

  const handleSaveItems = async (newItems: ClothingItem[]) => {
    setWardrobeState(prev => ({
      ...prev,
      clothingItems: [...prev.clothingItems, ...newItems],
    }));

    // Persist to backend API
    await Promise.all(
      newItems.map(item =>
        createItem({
          id: item.id,
          name: item.name,
          category: item.category,
          imageUrl: item.image,
        })
      )
    );
  };

  return <ClothingUpload onSave={handleSaveItems} />;
};

export default UploadPage;