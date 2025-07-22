import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'src'),
  base: '/',
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      // Proxy API endpoints
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/api/console': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true
      }
    },
    fs: {
      // Prevent serving TypeScript source files
      deny: ['.ts', '.tsx']
    }
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  }
});