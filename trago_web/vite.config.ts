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
      includeAssets: [
        'favicon.png',
        'favicon.svg',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-192-v2.png',
        'icon-512-v2.png',
      ],
      manifest: {
        name: 'TraGo',
        short_name: 'TraGo',
        description:
          'Promociones vigentes cerca de ti en Guadalajara. Favoritos offline.',
        theme_color: '#3B0B13',
        background_color: '#3B0B13',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'es-MX',
        start_url: '/',
        scope: '/',
        categories: ['lifestyle', 'shopping', 'food'],
        icons: [
          {
            src: '/icon-192-v2.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512-v2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512-v2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,woff2}'],
        // El video de marca (~2.2 MB) se sirve bajo demanda; no va al precache del SW.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globIgnores: ['**/pageload-*.mp4', '**/*.mp4'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
