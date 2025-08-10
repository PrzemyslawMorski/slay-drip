import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Development configuration
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: true,
    open: true,
  },
  define: {
    __DEV__: true,
  },
  build: {
    sourcemap: true,
    minify: false,
  },
  envPrefix: 'VITE_',
})
