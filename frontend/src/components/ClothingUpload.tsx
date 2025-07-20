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
    const clothingItems: ClothingItem[] = pendingItems.map(item => ({
      id: crypto.randomUUID(),
      name: item.name,
      category: item.category,
      color: item.color,
      brand: item.brand,
      image: item.preview,
      tags: item.tags,
      dateAdded: new Date().toISOString(),
    }));

    onSave(clothingItems);
    setPendingItems([]);
  };

  const EditDialog = () => {
    if (editingIndex === null) return null;
    const item = pendingItems[editingIndex];

    return (
      <Dialog open={true} onClose={() => setEditingIndex(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Item Details</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              value={item.name}
              onChange={(e) => updateItem(editingIndex, { name: e.target.value })}
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={item.category}
                onChange={(e) => updateItem(editingIndex, { category: e.target.value as ClothingItem['category'] })}
              >
                <MenuItem value="tops">Tops</MenuItem>
                <MenuItem value="bottoms">Bottoms</MenuItem>
                <MenuItem value="shoes">Shoes</MenuItem>
                <MenuItem value="accessories">Accessories</MenuItem>
                <MenuItem value="outerwear">Outerwear</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Color"
              value={item.color}
              onChange={(e) => updateItem(editingIndex, { color: e.target.value })}
              fullWidth
            />

            <TextField
              label="Brand"
              value={item.brand}
              onChange={(e) => updateItem(editingIndex, { brand: e.target.value })}
              fullWidth
            />

            <TextField
              label="Tags (comma separated)"
              value={item.tags.join(', ')}
              onChange={(e) => updateItem(editingIndex, { 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
              })}
              fullWidth
              helperText="e.g. casual, summer, favorite"
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
      <Typography variant="h5" gutterBottom>
        Upload Clothing Items
      </Typography>

      {/* Upload Area */}
      <Box
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          mb: 3,
          cursor: 'pointer',
          '&:hover': { backgroundColor: '#f5f5f5' },
        }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <CloudUpload sx={{ fontSize: 48, color: '#999', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
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
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {pendingItems.map((item, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card>
                  <Box sx={{ position: 'relative' }}>
                    <img
                      src={item.preview}
                      alt={item.name}
                      style={{
                        width: '100%',
                        height: 200,
                        objectFit: 'cover',
                      }}
                    />
                    <IconButton
                      sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.8)' }}
                      onClick={() => removeItem(index)}
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                  <CardContent>
                    <Typography variant="subtitle2" noWrap>
                      {item.name}
                    </Typography>
                    <Chip 
                      label={item.category} 
                      size="small" 
                      sx={{ mt: 1, mb: 1 }} 
                    />
                    <Box>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => setEditingIndex(index)}
                      >
                        Edit Details
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
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
    </Box>
  );
};

export default ClothingUpload;