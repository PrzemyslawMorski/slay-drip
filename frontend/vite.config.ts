/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    // Unit tests cover pure logic only. Browser behaviour is covered by the Playwright acceptance tests.
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
