import React, { useEffect } from 'react';
import WardrobeView from '../components/WardrobeView';
import { WardrobeState } from '../types';
import { useIndexedDB } from '../hooks/useIndexedDB';
import { getItems } from '../api';

const HomePage: React.FC = () => {
  const [wardrobeState, setWardrobeState] = useIndexedDB<WardrobeState>('wardrobeState', {
    clothingItems: [],
    outfits: [],
  });

  // Load items from backend on mount
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