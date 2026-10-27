import { copyFileSync, existsSync, readFileSync } from 'node:fs';
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
const ICON_192 = `/icon-192-v${ICON_VERSION}.png`;
const ICON_512 = `/icon-512-v${ICON_VERSION}.png`;

/** Copia el arte a un nombre con versión, sin ?v=, para el manifest. */
function publishVersionedIcons(version: number) {
  const root = dirname(fileURLToPath(import.meta.url));
  return {
    name: 'trago-versioned-pwa-icons',
    apply: 'build' as const,
    closeBundle() {
      const pairs: [string, string][] = [
        ['public/icon-192-v2.png', `dist/icon-192-v${version}.png`],
        ['public/icon-512-v2.png', `dist/icon-512-v${version}.png`],
      ];
      for (const [from, to] of pairs) {
        const src = join(root, from);
        if (!existsSync(src)) {
          throw new Error(`Falta el icono PWA ${from}`);
        }
        copyFileSync(src, join(root, to));
      }
    },
  };
}

export default defineConfig({
  server: {
    port: 5173,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: null,
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
        // En dev el SW de Vite falla al evaluar y, al recargar con la caché
        // vacía, deja la pantalla en blanco. Igual que Todo_pwa: el SW solo
        // vive en el build. El arranque de index.html limpia el que ya quedó.
        enabled: false,
        type: 'module',
      },
    }),
    publishVersionedIcons(ICON_VERSION),
  ],
});
