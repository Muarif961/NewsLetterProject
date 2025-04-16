import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'handle-subscribe-route',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/subscribe/')) {
            const html = fs.readFileSync(
              path.resolve(__dirname, 'public/subscribe.html'),
              'utf-8'
            );
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
            return;
          }
          next();
        });
      }
    },
    {
      name: 'disable-hmr-completely',
      // Disable HMR at the plugin level
      handleHotUpdate() {
        // Return empty array to prevent HMR updates
        return [];
      },
      // Add middleware to block HMR WebSocket connections
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Block any HMR-related requests
          if (req.url && (req.url.includes('__vite') || req.url.includes('hmr') || req.url.includes('vite-hmr'))) {
            res.statusCode = 404;
            res.end();
            return;
          }
          next();
        });
      }
    }
  ],
  root: '.',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5000,
    host: '0.0.0.0', 
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
    },
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:4001', // Updated to match backend port
        changeOrigin: true,
        secure: false,
        ws: true
      }
    },
    // Completely disable HMR
    hmr: false,
    fs: {
      allow: ['.', '../']
    },
    watch: {
      usePolling: false // Disable polling to reduce CPU usage
    },
    // Add specific Replit host to allowed hosts
    allowedHosts: ['3d030f67-658e-46ea-b894-789f1060c0e1-00-rfnzxambwv0e.sisko.replit.dev', '.replit.dev', '.repl.co']
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
});
