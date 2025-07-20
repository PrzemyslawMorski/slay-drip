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
          height: 200,
          gap: 0.5,
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
              bottom: 8,
              right: 8,
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              borderRadius: 1,
              px: 1,
              py: 0.5,
            }}
          >
            <Typography variant="caption">
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
      bottoms: selectedOutfit.items.filter(item => item.category === 'bottoms'),
      shoes: selectedOutfit.items.filter(item => item.category === 'shoes'),
      accessories: selectedOutfit.items.filter(item => item.category === 'accessories'),
    };

    return (
      <Dialog
        open={true}
        onClose={() => setSelectedOutfit(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {selectedOutfit.name}
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
                  <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />
                ))}
              </Box>
            )}
          </Box>

                     <Grid container spacing={2}>
             {Object.entries(categorizedItems).map(([category, items]) =>
               items.length > 0 && (
                                   <Grid item xs={12} sm={6} md={4} key={category}>
                  <Typography variant="subtitle2" sx={{ mb: 1, textTransform: 'capitalize' }}>
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
                      <CardContent sx={{ p: 1 }}>
                        <Typography variant="caption" noWrap>
                          {item.name}
                        </Typography>
                        {item.brand && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            {item.brand}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}
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
      <Typography variant="h5" gutterBottom>
        Your Outfits ({outfits.length})
      </Typography>

      {/* Search and Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search outfits by name or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant={showFavoritesOnly ? 'contained' : 'outlined'}
          startIcon={<Favorite />}
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          sx={{ minWidth: 'auto' }}
        >
          Favorites
        </Button>
      </Box>

      {/* Outfits Grid */}
             <Grid container spacing={3}>
         {filteredOutfits.map((outfit) => (
                       <Grid item xs={12} sm={6} md={4} lg={3} key={outfit.id}>
            <Card sx={{ position: 'relative' }}>
              <Box sx={{ position: 'relative' }}>
                {createOutfitThumbnail(outfit)}
                <IconButton
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(255,255,255,0.8)',
                  }}
                  onClick={() => toggleFavorite(outfit)}
                  size="small"
                >
                  {outfit.favorite ? (
                    <Favorite color="error" fontSize="small" />
                  ) : (
                    <FavoriteBorder fontSize="small" />
                  )}
                </IconButton>
              </Box>

              <CardContent>
                <Typography variant="h6" noWrap title={outfit.name}>
                  {outfit.name}
                </Typography>
                
                <Typography variant="body2" color="textSecondary">
                  {outfit.items.length} items
                </Typography>

                <Typography variant="caption" color="textSecondary" display="block">
                  {new Date(outfit.dateCreated).toLocaleDateString()}
                </Typography>

                {outfit.tags.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {outfit.tags.slice(0, 2).map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                    {outfit.tags.length > 2 && (
                      <Typography variant="caption" color="textSecondary">
                        +{outfit.tags.length - 2} more
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between' }}>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => setSelectedOutfit(outfit)}
                >
                  View
                </Button>
                <IconButton
                  size="small"
                  onClick={() => onOutfitDelete(outfit.id)}
                  color="error"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredOutfits.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="textSecondary">
            No outfits found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {searchTerm || showFavoritesOnly
              ? 'Try adjusting your search or filters'
              : 'Create your first outfit to get started'
            }
          </Typography>
        </Box>
      )}

      <OutfitDetailDialog />
    </Box>
  );
};

export default OutfitGallery;