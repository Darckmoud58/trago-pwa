/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import {
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { ICON_192, SW_ICON_TAG } from './lib/iconVersion';

declare let self: ServiceWorkerGlobalScope;

/** Cambia con ICON_VERSION → nuevo SW → autoUpdate en clientes. */
const SW_RELEASE = SW_ICON_TAG;
void SW_RELEASE;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//],
  })
);

registerRoute(/\/api\/(auth|favoritos)/i, new NetworkOnly());
registerRoute(/\/api\/sucursales\/cerca/i, new NetworkOnly());

registerRoute(
  /\/api\/(promociones|negocios)/i,
  new NetworkFirst({
    cacheName: 'trago-api-catalog',
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 30 }),
    ],
  })
);

/** Logos / manifest: red primero para que un deploy nuevo se vea en el teléfono. */
registerRoute(
  ({ url }) =>
    /\/(icon-\d+[^/]*\.png|apple-touch-icon\.png|favicon\.(png|ico|svg)|manifest\.webmanifest)$/i.test(
      url.pathname
    ),
  new NetworkFirst({
    cacheName: 'trago-pwa-icons',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 16,
        maxAgeSeconds: 60 * 60, // 1 h
      }),
    ],
  })
);

registerRoute(
  /^https:\/\/images\.unsplash\.com\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'trago-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  })
);

self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() || '' };
  }
  const title = data.title || 'TraGo';
  const options: NotificationOptions = {
    body: data.body || '',
    icon: ICON_192,
    badge: ICON_192,
    tag: data.tag || 'trago-push',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client && 'navigate' in client) {
            void client.focus();
            return (client as WindowClient).navigate(url);
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
