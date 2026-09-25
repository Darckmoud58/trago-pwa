/**
 * Caché local de últimas lecturas de API (IndexedDB).
 * No inventa datos: solo guarda lo que ya vino del servidor.
 * Al leer promociones, se filtran las caducadas.
 */
import type { Promo } from '../types';

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

export function isPromoActive(p: Promo, now = Date.now()): boolean {
  const end = p.termina_en || p.endsAt;
  if (!end) return true;
  const t = new Date(end).getTime();
  if (Number.isNaN(t)) return true;
  return t >= now;
}

export function filterActivePromos(promos: Promo[]): Promo[] {
  return promos.filter((p) => isPromoActive(p));
}

export const CACHE_KEYS = {
  promos: 'promociones',
  negocios: 'negocios',
  lastNear: 'sucursales_cerca',
} as const;
