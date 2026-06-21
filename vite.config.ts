import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:4000',
            changeOrigin: true,
          }
        }
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            // Isole les grosses dépendances dans leurs propres chunks : meilleur cache
            // et elles ne sont récupérées que par les pages/actions qui en ont besoin.
            manualChunks: {
              'react-pdf': ['@react-pdf/renderer'],
              'docx': ['docx'],
              'charts': ['recharts'],
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            },
          },
        },
      }
    };
});
