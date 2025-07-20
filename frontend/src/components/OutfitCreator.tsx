import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Paper,
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import { Add, Delete, Save, Clear, Favorite, FavoriteBorder } from '@mui/icons-material';
import { ClothingItem, Outfit } from '../types';
import WardrobeView from './WardrobeView';

interface OutfitCreatorProps {
  clothingItems: ClothingItem[];
  onSaveOutfit: (outfit: Outfit) => void;
}

const OutfitCreator: React.FC<OutfitCreatorProps> = ({ clothingItems, onSaveOutfit }) => {
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [outfitTags, setOutfitTags] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleItemsSelect = (items: ClothingItem[]) => {
    setSelectedItems(items);
  };

  const removeItemFromOutfit = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const clearOutfit = () => {
    setSelectedItems([]);
    setOutfitName('');
    setOutfitTags([]);
  };

  const handleSaveOutfit = async () => {
    if (selectedItems.length === 0 || !outfitName.trim()) return;

    try {
      const outfit: Outfit = {
        id: crypto.randomUUID(),
        name: outfitName.trim(),
        items: selectedItems,
        tags: outfitTags,
        dateCreated: new Date().toISOString(),
        favorite: false,
      };

      await onSaveOutfit(outfit);
      clearOutfit();
      setIsDialogOpen(false);
      setSelectionMode(false);
      setSaveSuccess(true);
      setSaveError(null);
    } catch (error) {
      console.error('Error saving outfit:', error);
      setSaveError('Failed to save outfit. Please try again.');
    }
  };

  const openSaveDialog = () => {
    if (selectedItems.length === 0) return;
    setIsDialogOpen(true);
  };

  const getOutfitPreview = () => {
    const categories = {
      outerwear: selectedItems.filter(item => item.category === 'outerwear'),
      tops: selectedItems.filter(item => item.category === 'tops'),
      dress: selectedItems.filter(item => item.category === 'dress'),
      bottoms: selectedItems.filter(item => item.category === 'bottoms'),
      shoes: selectedItems.filter(item => item.category === 'shoes'),
      accessories: selectedItems.filter(item => item.category === 'accessories'),
      bag: selectedItems.filter(item => item.category === 'bag'),
      hat: selectedItems.filter(item => item.category === 'hat'),
    };

    return categories;
  };

  const categorizedItems = getOutfitPreview();

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        Create Outfit
      </Typography>
      
      {/* Outfit Builder Section */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            Current Outfit ({selectedItems.length} items)
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            flexWrap: 'wrap',
            justifyContent: { xs: 'center', sm: 'flex-end' }
          }}>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setSelectionMode(!selectionMode)}
              color={selectionMode ? 'secondary' : 'primary'}
              size="small"
            >
              {selectionMode ? 'Done Selecting' : 'Add Items'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearOutfit}
              disabled={selectedItems.length === 0}
              size="small"
            >
              Clear
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={openSaveDialog}
              disabled={selectedItems.length === 0}
              size="small"
            >
              Save Outfit
            </Button>
          </Box>
        </Box>

        {selectedItems.length > 0 ? (
          <Grid container spacing={{ xs: 1, sm: 2 }}>
            {Object.entries(categorizedItems).map(([category, items]) =>
              items.length > 0 && (
                <Grid
                  key={category}
                  size={{
                    xs: 12,
                    sm: 6,
                    md: 4,
                    lg: 2.4
                  }}>
                  <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 1, 
                        textTransform: 'capitalize',
                        fontSize: { xs: '0.8rem', sm: '0.875rem' }
                      }}
                    >
                      {category} ({items.length})
                    </Typography>
                    {items.map(item => (
                      <Card key={item.id} sx={{ mb: 1, position: 'relative' }}>
                        <Box sx={{ position: 'relative' }}>
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{
                              width: '100%',
                              height: 120,
                              objectFit: 'cover',
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeItemFromOutfit(item.id)}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              '& .MuiSvgIcon-root': {
                                fontSize: { xs: '1rem', sm: '1.25rem' }
                              }
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                        <CardContent sx={{ p: 1 }}>
                          <Typography 
                            variant="caption" 
                            noWrap
                            sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                          >
                            {item.name}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Grid>
              )
            )}
          </Grid>
        ) : (
          <Box sx={{ 
            textAlign: 'center', 
            py: 4, 
            backgroundColor: '#f5f5f5', 
            borderRadius: 1 
          }}>
            <Typography variant="h6" color="textSecondary">
              No items selected
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Click "Add Items" to start building your outfit
            </Typography>
          </Box>
        )}
      </Paper>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Wardrobe Selection */}
      <WardrobeView
        items={clothingItems}
        onItemsSelect={handleItemsSelect}
        selectedItems={selectedItems}
        selectionMode={selectionMode}
      />
      
      {/* Save Outfit Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        keepMounted={false}
        disableEnforceFocus={true}
        disableAutoFocus={true}
        PaperProps={{
          sx: {
            mx: { xs: 1, sm: 2 },
            width: { xs: 'calc(100% - 16px)', sm: 'auto' }
          }
        }}
      >
        <DialogTitle>Save Outfit</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Outfit Name"
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              fullWidth
              required
              placeholder="e.g. Work Meeting, Date Night, Casual Friday"
              inputProps={{ 
                style: { fontSize: '16px' },
                autoComplete: 'off',
                autoCorrect: 'off',
                autoCapitalize: 'off',
                spellCheck: 'false'
              }}
            />

            <TextField
              label="Tags (comma separated)"
              value={outfitTags.join(', ')}
              onChange={(e) => setOutfitTags(
                e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
              )}
              fullWidth
              placeholder="e.g. formal, summer, favorite"
              helperText="Add tags to help organize and find your outfits later"
              inputProps={{ 
                style: { fontSize: '16px' },
                autoComplete: 'off',
                autoCorrect: 'off',
                autoCapitalize: 'off',
                spellCheck: 'false'
              }}
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Outfit Preview ({selectedItems.length} items)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedItems.map(item => (
                  <Box key={item.id} sx={{ width: 60 }}>
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: '100%',
                        height: 60,
                        objectFit: 'cover',
                        borderRadius: 4,
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveOutfit}
            variant="contained"
            disabled={!outfitName.trim() || selectedItems.length === 0}
          >
            Save Outfit
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success/Error Messages */}
      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
      >
        <Alert severity="success" onClose={() => setSaveSuccess(false)}>
          Outfit saved successfully!
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!saveError}
        autoHideDuration={5000}
        onClose={() => setSaveError(null)}
      >
        <Alert severity="error" onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OutfitCreator;