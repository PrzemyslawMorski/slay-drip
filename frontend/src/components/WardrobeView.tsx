import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Search, Delete, Favorite, FavoriteBorder } from '@mui/icons-material';
import { ClothingItem } from '../types';

interface WardrobeViewProps {
  items: ClothingItem[];
  onItemsSelect?: (items: ClothingItem[]) => void;
  onItemDelete?: (itemId: string) => void;
  selectedItems?: ClothingItem[];
  selectionMode?: boolean;
}

const WardrobeView: React.FC<WardrobeViewProps> = ({
  items,
  onItemsSelect,
  onItemDelete,
  selectedItems = [],
  selectionMode = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'tops', label: 'Tops' },
    { value: 'bottoms', label: 'Bottoms' },
    { value: 'shoes', label: 'Shoes' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'outerwear', label: 'Outerwear' },
  ];

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const handleItemSelect = (item: ClothingItem) => {
    if (!selectionMode || !onItemsSelect) return;

    const isSelected = selectedItems.some(selected => selected.id === item.id);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedItems.filter(selected => selected.id !== item.id);
    } else {
      newSelection = [...selectedItems, item];
    }
    
    onItemsSelect(newSelection);
  };

  const isItemSelected = (item: ClothingItem) => {
    return selectedItems.some(selected => selected.id === item.id);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Your Wardrobe ({items.length} items)
      </Typography>

      {/* Search */}
      <TextField
        placeholder="Search by name, brand, color, or tags..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onChange={(_, newValue) => setSelectedCategory(newValue)}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {categories.map(category => (
          <Tab
            key={category.value}
            label={`${category.label} ${category.value === 'all' 
              ? `(${items.length})` 
              : `(${items.filter(item => item.category === category.value).length})`
            }`}
            value={category.value}
          />
        ))}
      </Tabs>

      {/* Items Grid */}
      <Grid container spacing={2}>
        {filteredItems.map((item) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
            <Card 
              sx={{ 
                cursor: selectionMode ? 'pointer' : 'default',
                border: isItemSelected(item) ? '2px solid #1976d2' : '1px solid #e0e0e0',
                position: 'relative',
              }}
              onClick={() => handleItemSelect(item)}
            >
              {selectionMode && (
                <Checkbox
                  checked={isItemSelected(item)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 1,
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    borderRadius: '50%',
                  }}
                />
              )}
              
              <CardMedia
                component="img"
                height="200"
                image={item.image}
                alt={item.name}
                sx={{ objectFit: 'cover' }}
              />
              
              <CardContent>
                <Typography variant="subtitle1" noWrap title={item.name}>
                  {item.name}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1 }}>
                  <Chip
                    label={item.category}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  {item.color && (
                    <Chip
                      label={item.color}
                      size="small"
                      sx={{
                        backgroundColor: item.color.toLowerCase(),
                        color: getContrastColor(item.color),
                      }}
                    />
                  )}
                </Box>

                {item.brand && (
                  <Typography variant="body2" color="textSecondary">
                    {item.brand}
                  </Typography>
                )}

                {item.tags.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {item.tags.slice(0, 3).map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                    {item.tags.length > 3 && (
                      <Typography variant="caption" color="textSecondary">
                        +{item.tags.length - 3} more
                      </Typography>
                    )}
                  </Box>
                )}

                {!selectionMode && onItemDelete && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemDelete(item.id);
                    }}
                    sx={{ mt: 1 }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredItems.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="textSecondary">
            No items found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {searchTerm ? 'Try adjusting your search terms' : 'Start by uploading some clothing items'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Helper function to get contrasting text color
function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export default WardrobeView;