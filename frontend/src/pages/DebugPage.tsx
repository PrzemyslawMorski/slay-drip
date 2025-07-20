import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Button } from '@mui/material';

const DebugPage: React.FC = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
  const hasServiceWorker = 'serviceWorker' in navigator;
  
  const debugInfo = {
    'User Agent': navigator.userAgent,
    'Is iOS': isIOS ? 'Yes' : 'No',
    'Is Standalone': isStandalone ? 'Yes' : 'No',
    'Service Worker Support': hasServiceWorker ? 'Yes' : 'No',
    'Display Mode': window.matchMedia('(display-mode: standalone)').matches ? 'Standalone' : 'Browser',
    'Viewport Width': window.innerWidth,
    'Viewport Height': window.innerHeight,
    'Screen Width': window.screen.width,
    'Screen Height': window.screen.height,
    'Device Pixel Ratio': window.devicePixelRatio,
    'Online Status': navigator.onLine ? 'Online' : 'Offline',
    'Location': window.location.href,
    'LocalStorage Available': (() => {
      try {
        const test = '__test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return 'Yes';
      } catch {
        return 'No (Private Mode?)';
      }
    })(),
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleClearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      alert('Cache cleared');
    }
  };

  const handleUnregisterSW = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      alert('Service workers unregistered');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        PWA Debug Info
      </Typography>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Environment Information
        </Typography>
        <List dense>
          {Object.entries(debugInfo).map(([key, value]) => (
            <ListItem key={key}>
              <ListItemText 
                primary={key}
                secondary={String(value)}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Debug Actions
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button variant="outlined" onClick={handleReload}>
            Force Reload
          </Button>
          <Button variant="outlined" onClick={handleClearCache}>
            Clear Cache
          </Button>
          <Button variant="outlined" onClick={handleUnregisterSW}>
            Unregister Service Worker
          </Button>
        </Box>
      </Paper>

      {!isStandalone && (
        <Paper sx={{ p: 2, backgroundColor: '#fff3cd' }}>
          <Typography variant="h6" color="warning">
            ⚠️ Not in Standalone Mode
          </Typography>
          <Typography>
            This page is being viewed in a browser tab, not as a standalone PWA. 
            To test PWA functionality, add this site to your home screen and open it from there.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default DebugPage;