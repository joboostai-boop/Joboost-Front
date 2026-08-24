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
            //
            // ⚠️ 'react-pdf' retiré volontairement le 16/08 : cette assignation manuelle
            // faisait précharger @react-pdf/renderer (1,4 Mo) sur TOUTE page, y compris
            // l'accueil, alors qu'il n'est utilisé que dans l'export PDF du CV/lettre
            // (services/atsExport.tsx, chargé en import() dynamique). 'docx', importé au
            // même endroit de la même façon, n'a jamais eu ce problème sans être listé ici
            // — c'est bien l'entrée manuelle qui causait le préchargement, pas l'usage réel.
            // Laisser Rollup découper @react-pdf/renderer automatiquement respecte la
            // frontière du dynamic import() et ne le précharge plus qu'à l'usage.
            manualChunks: {
              'docx': ['docx'],
              'charts': ['recharts'],
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            },
          },
        },
      }
    };
});
