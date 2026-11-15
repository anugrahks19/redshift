import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error - shared Node ESM middleware
import { createScientificApiMiddleware } from '../../scripts/scientific-api-middleware.mjs';

function scientificApiPlugin(): Plugin {
  const apiHandler = createScientificApiMiddleware();
  return {
    name: 'scientific-api-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url ?? '').startsWith('/api/')) {
          void apiHandler(req, res, next);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), scientificApiPlugin()],
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei', 'leaflet'],
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (
            id.includes('node_modules/three') ||
            id.includes('node_modules/@react-three')
          ) {
            return 'three';
          }
          if (id.includes('node_modules/leaflet')) {
            return 'leaflet';
          }
          return undefined;
        },
      },
    },
  },
});

