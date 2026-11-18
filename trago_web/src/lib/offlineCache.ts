/**
 * Caché local de últimas lecturas de API (IndexedDB).
 * No inventa datos: solo guarda lo que ya vino del servidor.
 * Al leer promociones, se filtran las caducadas.
 * Contenido 18+ / requiresAuth no debe sobrevivir un logout ni un 404 de acceso.
 */
import type { Promo } from '../types';
import { getAgeBand } from './ageBand';
import { readToken } from '../api';
import {
  canUseRestrictedOfflineCache as canUseRestrictedOfflineCachePolicy,
  filterActivePromos as filterActivePromosPolicy,
  filterGuestSafePromos as filterGuestSafePromosPolicy,
  isOfficialPromo as isOfficialPromoPolicy,
  isPromoActive as isPromoActivePolicy,
  isRestrictedCachedPromo as isRestrictedCachedPromoPolicy,
} from './offlineCachePolicy';

export {
  filterActivePromosPolicy as filterActivePromos,
  filterGuestSafePromosPolicy as filterGuestSafePromos,
  isOfficialPromoPolicy as isOfficialPromo,
  isPromoActivePolicy as isPromoActive,
  isRestrictedCachedPromoPolicy as isRestrictedCachedPromo,
};

const DB_NAME = 'trago-offline';
const DB_VERSION = 2;
const STORE = 'cache';
const LS_PREFIX = 'trago_cache_';

export type CacheEntry<T> = {
  key: string;
  data: T;
  savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('no-idb'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('favoritos')) {
        db.createObjectStore('favoritos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function lsGet<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
  } catch {
    return null;
  }
}

function lsSet<T>(entry: CacheEntry<T>) {
  localStorage.setItem(LS_PREFIX + entry.key, JSON.stringify(entry));
}

function lsRemove(key: string) {
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    /* ignore */
  }
}

export async function cacheSet<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { key, data, savedAt: Date.now() };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    lsSet(entry);
  }
}

export async function cacheGet<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as CacheEntry<T>) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return lsGet<T>(key);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  lsRemove(key);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* idb no disponible: localStorage ya limpio */
  }
}

async function listCacheKeys(): Promise<string[]> {
  const keys = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(LS_PREFIX)) keys.add(k.slice(LS_PREFIX.length));
    }
  } catch {
    /* ignore */
  }
  try {
    const db = await openDb();
    const idbKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
    for (const k of idbKeys) keys.add(String(k));
  } catch {
    /* ignore */
  }
  return [...keys];
}

/** ¿La sesión actual puede reutilizar offline una promo restringida? */
export function canUseRestrictedOfflineCache(): boolean {
  return canUseRestrictedOfflineCachePolicy(readToken(), getAgeBand());
}

/**
 * Tras logout o rechazo 401/403/404: quita detalles restringidos y limpia
 * listas cacheadas. No toca el store `favoritos`.
 */
export async function purgeRestrictedCatalogCache(): Promise<void> {
  const keys = await listCacheKeys();
  for (const key of keys) {
    if (key.startsWith('promo_detalle_')) {
      const entry = await cacheGet<{ promo?: Promo }>(key);
      if (
        !entry?.data?.promo ||
        isRestrictedCachedPromoPolicy(entry.data.promo)
      ) {
        await cacheDelete(key);
      }
      continue;
    }
  }

  const promosEntry = await cacheGet<Promo[]>(CACHE_KEYS.promos);
  if (promosEntry?.data?.length) {
    const safe = filterGuestSafePromosPolicy(promosEntry.data);
    if (safe.length !== promosEntry.data.length) {
      await cacheSet(CACHE_KEYS.promos, safe);
    }
  }

  const nearEntry = await cacheGet<{ promos?: Promo[] }>(CACHE_KEYS.lastNear);
  if (nearEntry?.data?.promos?.length) {
    const safe = filterGuestSafePromosPolicy(nearEntry.data.promos);
    if (safe.length !== nearEntry.data.promos.length) {
      await cacheSet(CACHE_KEYS.lastNear, { ...nearEntry.data, promos: safe });
    }
  }
}

export const CACHE_KEYS = {
  // bump key para invalidar caché con demos del seed
  promos: 'promociones_oficiales_v1',
  negocios: 'negocios',
  /** Sucursales + promos de la última búsqueda Cerca (no inventa). */
  lastNear: 'cerca_sucursales_y_promos_v2',
  promoDetail: (id: string) => `promo_detalle_${id}`,
} as const;
