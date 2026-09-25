import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'TraGo',
        short_name: 'TraGo',
        description:
          'Promociones vigentes cerca de ti en Guadalajara. Favoritos offline.',
        theme_color: '#3B0B13',
        background_color: '#F7E5B5',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'es-MX',
        start_url: '/',
        scope: '/',
        categories: ['lifestyle', 'shopping', 'food'],
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,woff2}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
