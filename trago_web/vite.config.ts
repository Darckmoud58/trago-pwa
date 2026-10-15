import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { ICON_192, ICON_512, ICON_VERSION } from './src/lib/iconVersion';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // SW nuevo → se activa solo (como Duolingo web: assets frescos en la próxima visita).
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
        id: '/',
        name: 'TraGo',
        short_name: 'TraGo',
        description:
          'Promociones vigentes cerca de ti en Guadalajara. Favoritos offline.',
        theme_color: '#3B0B13',
        background_color: '#3B0B13',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        lang: 'es-MX',
        start_url: '/',
        scope: '/',
        categories: ['lifestyle', 'shopping', 'food'],
        // Query ?v=N: al subir ICON_VERSION el manifest apunta a “otro” recurso.
        icons: [
          {
            src: ICON_192,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: ICON_512,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: ICON_512,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        // Iconos fuera del precache: NetworkFirst en sw.ts (deploy = logo fresco).
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globIgnores: [
          '**/pageload-*.mp4',
          '**/*.mp4',
          '**/icon-*.png',
          '**/apple-touch-icon.png',
          '**/favicon.png',
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  define: {
    __TRAGO_ICON_VERSION__: JSON.stringify(ICON_VERSION),
  },
});
