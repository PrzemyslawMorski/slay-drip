import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search,
  Favorite,
  FavoriteBorder,
  Delete,
  Edit,
  Visibility,
} from '@mui/icons-material';
import { Outfit } from '../types';

interface OutfitGalleryProps {
  outfits: Outfit[];
  onOutfitUpdate: (outfit: Outfit) => void;
  onOutfitDelete: (outfitId: string) => void;
}

const OutfitGallery: React.FC<OutfitGalleryProps> = ({
  outfits,
  onOutfitUpdate,
  onOutfitDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const filteredOutfits = outfits.filter(outfit => {
    const matchesSearch = searchTerm === '' ||
      outfit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      outfit.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFavorites = !showFavoritesOnly || outfit.favorite;

    return matchesSearch && matchesFavorites;
  });

  const toggleFavorite = (outfit: Outfit) => {
    onOutfitUpdate({
      ...outfit,
      favorite: !outfit.favorite,
    });
  };

  const createOutfitThumbnail = (outfit: Outfit) => {
    // Create a grid of the first 4 items
    const itemsToShow = outfit.items.slice(0, 4);
    
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: itemsToShow.length === 1 ? '1fr' : '1fr 1fr',
          gridTemplateRows: itemsToShow.length <= 2 ? '1fr' : '1fr 1fr',
          height: { xs: 150, sm: 200 },
          gap: 0.5,
          position: 'relative',
        }}
      >
        {itemsToShow.map((item, index) => (
          <img
            key={item.id}
            src={item.image}
            alt={item.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ))}
        {outfit.items.length > 4 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              borderRadius: 1,
              px: 1,
              py: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
              +{outfit.items.length - 4} more
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const OutfitDetailDialog = () => {
    if (!selectedOutfit) return null;

    const categorizedItems = {
      outerwear: selectedOutfit.items.filter(item => item.category === 'outerwear'),
      tops: selectedOutfit.items.filter(item => item.category === 'tops'),
      dress: selectedOutfit.items.filter(item => item.category === 'dress'),
      bottoms: selectedOutfit.items.filter(item => item.category === 'bottoms'),
      shoes: selectedOutfit.items.filter(item => item.category === 'shoes'),
      accessories: selectedOutfit.items.filter(item => item.category === 'accessories'),
      bag: selectedOutfit.items.filter(item => item.category === 'bag'),
      hat: selectedOutfit.items.filter(item => item.category === 'hat'),
    };

    return (
      <Dialog
        open={true}
        onClose={() => setSelectedOutfit(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            mx: { xs: 1, sm: 2 },
            width: { xs: 'calc(100% - 16px)', sm: 'auto' }
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              {selectedOutfit.name}
            </Typography>
            <IconButton onClick={() => toggleFavorite(selectedOutfit)}>
              {selectedOutfit.favorite ? <Favorite color="error" /> : <FavoriteBorder />}
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Created: {new Date(selectedOutfit.dateCreated).toLocaleDateString()}
            </Typography>
            {selectedOutfit.tags.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {selectedOutfit.tags.map(tag => (
                  <Chip 
                    key={tag} 
                    label={tag} 
                    size="small" 
                    sx={{ 
                      mr: 0.5, 
                      mb: 0.5,
                      fontSize: { xs: '0.6rem', sm: '0.75rem' }
                    }} 
                  />
                ))}
              </Box>
            )}
          </Box>

          <Grid container spacing={{ xs: 1, sm: 2 }}>
            {Object.entries(categorizedItems).map(([category, items]) =>
              items.length > 0 && (
                <Grid
                  key={category}
                  size={{
                    xs: 12,
                    sm: 6,
                    md: 4
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
                      <Card key={item.id} sx={{ mb: 1 }}>
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{
                            width: '100%',
                            height: 120,
                            objectFit: 'cover',
                          }}
                        />
                        <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                          <Typography 
                            variant="caption"
                            sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                          >
                            {item.name}
                          </Typography>
                          {item.color && (
                            <Chip
                              label={item.color}
                              size="small"
                              sx={{ 
                                ml: 1,
                                fontSize: { xs: '0.6rem', sm: '0.75rem' }
                              }}
                            />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Grid>
              )
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedOutfit(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        My Outfits ({outfits.length})
      </Typography>

      {/* Search and Filter */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <TextField
          placeholder="Search outfits by name or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ 
            flexGrow: 1,
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
        <Button
          variant={showFavoritesOnly ? "contained" : "outlined"}
          startIcon={<Favorite />}
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Favorites Only
        </Button>
      </Box>

      {/* Outfits Grid */}
      <Grid container spacing={{ xs: 1, sm: 2 }}>
        {filteredOutfits.map((outfit) => (
          <Grid
            key={outfit.id}
            size={{
              xs: 6,
              sm: 4,
              md: 3,
              lg: 2.4
            }}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                  boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
            >
              <Box sx={{ position: 'relative' }}>
                {createOutfitThumbnail(outfit)}
                <IconButton
                  size="small"
                  onClick={() => toggleFavorite(outfit)}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }
                  }}
                >
                  {outfit.favorite ? <Favorite color="error" /> : <FavoriteBorder />}
                </IconButton>
              </Box>
              
              <CardContent sx={{ flexGrow: 1, p: { xs: 1, sm: 2 } }}>
                <Typography 
                  variant="subtitle2" 
                  noWrap 
                  title={outfit.name}
                  sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                >
                  {outfit.name}
                </Typography>
                
                <Typography 
                  variant="body2" 
                  color="textSecondary"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                >
                  {outfit.items.length} items
                </Typography>

                {outfit.tags.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {outfit.tags.slice(0, 2).map(tag => (
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
                    {outfit.tags.length > 2 && (
                      <Typography 
                        variant="caption" 
                        color="textSecondary"
                        sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}
                      >
                        +{outfit.tags.length - 2} more
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ p: { xs: 1, sm: 2 }, pt: 0 }}>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => setSelectedOutfit(outfit)}
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                >
                  View
                </Button>
                <IconButton
                  size="small"
                  onClick={() => onOutfitDelete(outfit.id)}
                  sx={{
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }
                  }}
                >
                  <Delete />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredOutfits.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="textSecondary">
            {outfits.length === 0 ? 'No outfits created yet' : 'No outfits match your search'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {outfits.length === 0 
              ? 'Start by creating your first outfit'
              : 'Try adjusting your search terms or filters'
            }
          </Typography>
        </Box>
      )}

      <OutfitDetailDialog />
    </Box>
  );
};

export default OutfitGallery;