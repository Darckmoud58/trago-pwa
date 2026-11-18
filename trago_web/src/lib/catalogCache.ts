import { purgeRestrictedCatalogCache } from './offlineCache';

/** Limpia caché de catálogo al login/logout/banda (SW + IndexedDB sensible). */
export async function clearCatalogCache(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      await caches.delete('trago-api-catalog');
    }
  } catch {
    /* ignore */
  }
  try {
    await purgeRestrictedCatalogCache();
  } catch {
    /* ignore */
  }
}
