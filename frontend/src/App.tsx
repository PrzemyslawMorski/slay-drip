
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import CreateOutfitPage from './pages/CreateOutfitPage';
import OutfitsPage from './pages/OutfitsPage';
import DebugPage from './pages/DebugPage';

function App() {
  useEffect(() => {
    // iOS PWA improvements
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    if (isIOS && isStandalone) {
      // Prevent zoom on double tap
      let lastTouchEnd = 0;
      document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, false);

      // Handle iOS safe areas
      document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
      document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
      document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)');
      document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)');
    }

    // Handle PWA visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isStandalone) {
        // App became visible, check for updates
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ action: 'CHECK_FOR_UPDATES' });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/create-outfit" element={<CreateOutfitPage />} />
          <Route path="/outfits" element={<OutfitsPage />} />
          <Route path="/debug" element={<DebugPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
