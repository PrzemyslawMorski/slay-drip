
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import CreateOutfitPage from './pages/CreateOutfitPage';
import OutfitsPage from './pages/OutfitsPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/create-outfit" element={<CreateOutfitPage />} />
          <Route path="/outfits" element={<OutfitsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
