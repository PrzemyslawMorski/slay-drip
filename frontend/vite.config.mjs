import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'
  
  console.log(`Building for environment: ${mode}`)
  console.log(`Production mode: ${isProduction}`)
  console.log(`Development mode: ${isDevelopment}`)

  return {
    plugins: [react()],
    
    // Environment-specific configurations
    server: isDevelopment ? {
      port: 3001,
      host: true,
      open: true,
    } : undefined,
    
    define: {
      __DEV__: !isProduction,
      __ENVIRONMENT__: JSON.stringify(mode),
    },
    
    build: {
      sourcemap: isDevelopment,
      minify: isProduction ? 'terser' : false,
      rollupOptions: isProduction ? {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            mui: ['@mui/material', '@mui/icons-material'],
          },
        },
      } : undefined,
    },
    
    // Environment variables
    envPrefix: 'VITE_',
    
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', '@mui/material', '@mui/icons-material'],
    },
    
    // Vitest configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      testTimeout: 10000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/mockData',
        ],
      },
    },
  }
}) 