import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { Delete, CloudUpload, Edit } from '@mui/icons-material';
import { ClothingItem } from '../types';

interface PendingItem {
  file: File;
  preview: string;
  name: string;
  category: ClothingItem['category'];
  color: string;
  brand: string;
  tags: string[];
}

interface ClothingUploadProps {
  onSave: (items: ClothingItem[]) => void;
}

const ClothingUpload: React.FC<ClothingUploadProps> = ({ onSave }) => {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    processFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    setProcessing(true);
    const newItems: PendingItem[] = [];

    for (const file of files) {
      try {
        const preview = await fileToBase64(file);
        const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        
        newItems.push({
          file,
          preview,
          name,
          category: 'tops', // Default category
          color: '',
          brand: '',
          tags: [],
        });
      } catch (error) {
        console.error('Error processing file:', file.name, error);
      }
    }

    setPendingItems(prev => [...prev, ...newItems]);
    setProcessing(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const updateItem = (index: number, updates: Partial<PendingItem>) => {
    setPendingItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (index: number) => {
    setPendingItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      const invalidItems = pendingItems.filter(item => !item.name.trim() || !item.category);
      if (invalidItems.length > 0) {
        setSaveError('Please fill in all required fields (name and category) for all items.');
        return;
      }

      const clothingItems: ClothingItem[] = pendingItems.map(item => ({
        id: crypto.randomUUID(),
        name: item.name.trim(),
        category: item.category,
        color: item.color.trim(),
        brand: item.brand.trim(),
        image: item.preview,
        tags: item.tags,
        dateAdded: new Date().toISOString(),
      }));

      await onSave(clothingItems);
      setPendingItems([]);
      setSaveSuccess(true);
      setSaveError(null);
    } catch (error) {
      console.error('Error saving items:', error);
      let errorMessage = 'Failed to save items. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('quota exceeded')) {
          errorMessage = 'Storage quota exceeded. Please delete some items or clear browser data and try again.';
        } else if (error.message.includes('localStorage')) {
          errorMessage = 'Storage access denied. Please check if you\'re in private mode and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setSaveError(errorMessage);
    }
  };

  const EditDialog = () => {
    if (editingIndex === null) return null;
    const item = pendingItems[editingIndex];

    return (
      <Dialog 
        open={true} 
        onClose={() => setEditingIndex(null)} 
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
        <DialogTitle>Edit Item Details</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              value={item.name}
              onChange={(e) => updateItem(editingIndex, { name: e.target.value })}
              fullWidth
              inputProps={{ 
                style: { fontSize: '16px' },
                autoComplete: 'off',
                autoCorrect: 'off',
                autoCapitalize: 'off',
                spellCheck: 'false'
              }}
            />
            
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={item.category}
                onChange={(e) => updateItem(editingIndex, { category: e.target.value as ClothingItem['category'] })}
                sx={{ '& .MuiSelect-select': { fontSize: '16px' } }}
              >
                <MenuItem value="tops">Tops</MenuItem>
                <MenuItem value="bottoms">Bottoms</MenuItem>
                <MenuItem value="dress">Dress</MenuItem>
                <MenuItem value="shoes">Shoes</MenuItem>
                <MenuItem value="accessories">Accessories</MenuItem>
                <MenuItem value="bag">Bag</MenuItem>
                <MenuItem value="hat">Hat</MenuItem>
                <MenuItem value="outerwear">Outerwear</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Color"
              value={item.color}
              onChange={(e) => updateItem(editingIndex, { color: e.target.value })}
              fullWidth
              inputProps={{ 
                style: { fontSize: '16px' },
                autoComplete: 'off',
                autoCorrect: 'off',
                autoCapitalize: 'off',
                spellCheck: 'false'
              }}
            />

            <TextField
              label="Brand"
              value={item.brand}
              onChange={(e) => updateItem(editingIndex, { brand: e.target.value })}
              fullWidth
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
              value={item.tags.join(', ')}
              onChange={(e) => updateItem(editingIndex, { 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
              })}
              fullWidth
              inputProps={{ 
                style: { fontSize: '16px' },
                autoComplete: 'off',
                autoCorrect: 'off',
                autoCapitalize: 'off',
                spellCheck: 'false'
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingIndex(null)}>Cancel</Button>
          <Button onClick={() => setEditingIndex(null)} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
        Upload Clothing Items
      </Typography>
      
      {/* Upload Area */}
      <Box
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: { xs: 2, sm: 4 },
          textAlign: 'center',
          mb: 3,
          cursor: 'pointer',
          '&:hover': { backgroundColor: '#f5f5f5' },
        }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <CloudUpload sx={{ fontSize: { xs: 36, sm: 48 }, color: '#999', mb: 2 }} />
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Drag & drop images here or click to select
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Upload up to 40 clothing items at once
        </Typography>
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </Box>
      
      {processing && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>Processing images...</Typography>
          <LinearProgress />
        </Box>
      )}
      
      {/* Pending Items Grid */}
      {pendingItems.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            Items to Upload ({pendingItems.length})
          </Typography>
          
          <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 3 }}>
            {pendingItems.map((item, index) => (
              <Grid
                key={index}
                size={{
                  xs: 6,
                  sm: 4,
                  md: 3,
                  lg: 2.4
                }}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ position: 'relative' }}>
                    <img
                      src={item.preview}
                      alt={item.name}
                      style={{
                        width: '100%',
                        height: 150,
                        objectFit: 'cover',
                      }}
                    />
                    <IconButton
                      sx={{ 
                        position: 'absolute', 
                        top: 4, 
                        right: 4, 
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '& .MuiSvgIcon-root': {
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }
                      }}
                      onClick={() => removeItem(index)}
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: { xs: 1, sm: 2 } }}>
                    <Typography 
                      variant="subtitle2" 
                      noWrap
                      sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                    >
                      {item.name}
                    </Typography>
                    <Chip 
                      label={item.category} 
                      size="small" 
                      sx={{ 
                        mt: 1, 
                        mb: 1,
                        fontSize: { xs: '0.6rem', sm: '0.75rem' }
                      }} 
                    />
                    <Box>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => setEditingIndex(index)}
                        sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
                      >
                        Edit Details
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => setPendingItems([])}
            >
              Clear All
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={pendingItems.length === 0}
            >
              Save {pendingItems.length} Items
            </Button>
          </Box>
        </>
      )}
      
      <EditDialog />
      
      {/* Success/Error Messages */}
      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
      >
        <Alert severity="success" onClose={() => setSaveSuccess(false)}>
          Items saved successfully!
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

export default ClothingUpload;