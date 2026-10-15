import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Lee ICON_VERSION desde src/lib/iconVersion.ts (evita imports TS en tsc -b). */
function readIconVersion(): number {
  const root = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(root, 'src/lib/iconVersion.ts'), 'utf8');
  const m = src.match(/export const ICON_VERSION = (\d+)/);
  return m ? Number(m[1]) : 1;
}

const ICON_VERSION = readIconVersion();
const ICON_192 = `/icon-192-v2.png?v=${ICON_VERSION}`;
const ICON_512 = `/icon-512-v2.png?v=${ICON_VERSION}`;

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
});
