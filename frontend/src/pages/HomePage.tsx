import React from 'react';
import WardrobeView from '../components/WardrobeView';
import { WardrobeState } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';

const HomePage: React.FC = () => {
  const [wardrobeState, setWardrobeState] = useIndexedDB<WardrobeState>('wardrobeState', {
    clothingItems: [],
    outfits: [],
  });

  const handleItemDelete = (itemId: string) => {
    setWardrobeState(prev => ({
      ...prev,
      clothingItems: prev.clothingItems.filter(item => item.id !== itemId),
      // Also remove item from any outfits
      outfits: prev.outfits.map(outfit => ({
        ...outfit,
        items: outfit.items.filter(item => item.id !== itemId),
      })),
    }));
  };

  return (
    <WardrobeView
      items={wardrobeState.clothingItems}
      onItemDelete={handleItemDelete}
    />
  );
};

export default HomePage;