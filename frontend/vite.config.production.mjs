import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production configuration
export default defineConfig({
  plugins: [react()],
  define: {
    __DEV__: false,
  },
  build: {
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
        },
      },
    },
  },
  envPrefix: 'VITE_',
})
