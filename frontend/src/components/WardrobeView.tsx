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
    { value: 'dress', label: 'Dresses' },
    { value: 'shoes', label: 'Shoes' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'bag', label: 'Bags' },
    { value: 'hat', label: 'Hats' },
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
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        Your Wardrobe ({items.length} items)
      </Typography>
      {/* Search */}
      <TextField
        placeholder="Search by name, brand, color, or tags..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fullWidth
        sx={{ 
          mb: 3,
          '& .MuiOutlinedInput-root': {
            fontSize: '16px', // Prevent zoom on iOS
          }
        }}
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
        allowScrollButtonsMobile
      >
        {categories.map(category => (
          <Tab
            key={category.value}
            label={`${category.label} ${category.value === 'all' 
              ? `(${items.length})` 
              : `(${items.filter(item => item.category === category.value).length})`
            }`}
            value={category.value}
            sx={{
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              minWidth: { xs: 80, sm: 120 }
            }}
          />
        ))}
      </Tabs>
      {/* Items Grid */}
      <Grid container spacing={{ xs: 1, sm: 2, md: 2 }}>
        {filteredItems.map((item) => (
          <Grid
            key={item.id}
            size={{
              xs: 6,
              sm: 4,
              md: 3,
              lg: 2.4
            }}>
            <Card 
              sx={{ 
                cursor: selectionMode ? 'pointer' : 'default',
                border: isItemSelected(item) ? '2px solid #1976d2' : '1px solid #e0e0e0',
                position: 'relative',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                  boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
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
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: '50%',
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1.2rem', sm: '1.5rem' }
                    }
                  }}
                />
              )}
              
              <CardMedia
                component="img"
                height="200"
                image={item.image}
                alt={item.name}
                sx={{ 
                  objectFit: 'cover',
                  height: { xs: 150, sm: 200 }
                }}
              />
              
              <CardContent sx={{ flexGrow: 1, p: { xs: 1, sm: 2 } }}>
                <Typography 
                  variant="subtitle2" 
                  noWrap 
                  title={item.name}
                  sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                >
                  {item.name}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={item.category}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}
                  />
                  {item.color && (
                    <Chip
                      label={item.color}
                      size="small"
                      sx={{
                        backgroundColor: item.color.toLowerCase(),
                        color: getContrastColor(item.color),
                        fontSize: { xs: '0.6rem', sm: '0.75rem' }
                      }}
                    />
                  )}
                </Box>

                {item.brand && (
                  <Typography 
                    variant="body2" 
                    color="textSecondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                  >
                    {item.brand}
                  </Typography>
                )}

                {item.tags.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {item.tags.slice(0, 2).map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          mr: 0.5, 
                          mb: 0.5,
                          fontSize: { xs: '0.6rem', sm: '0.75rem' }
                        }}
                      />
                    ))}
                    {item.tags.length > 2 && (
                      <Typography 
                        variant="caption" 
                        color="textSecondary"
                        sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}
                      >
                        +{item.tags.length - 2} more
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
                    sx={{ 
                      mt: 1,
                      '& .MuiSvgIcon-root': {
                        fontSize: { xs: '1rem', sm: '1.25rem' }
                      }
                    }}
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