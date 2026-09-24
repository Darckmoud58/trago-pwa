/**
 * Favoritos locales — disponibles sin internet.
 * Persistencia en IndexedDB (fallback localStorage).
 */

export type FavoritePlace = {
  id: string;
  type: 'ubicacion' | 'empresa';
  nombre: string;
  subtitulo?: string;
  direccion?: string;
  colonia?: string;
  municipio?: string;
  horario?: string;
  distanciaKm?: number;
  imagen?: string;
  savedAt: number;
};

const DB_NAME = 'trago-offline';
const STORE = 'favoritos';
const LS_KEY = 'trago_favoritos_v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('no-idb'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function lsRead(): FavoritePlace[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as FavoritePlace[]) : [];
  } catch {
    return [];
  }
}

function lsWrite(items: FavoritePlace[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

export async function listFavorites(): Promise<FavoritePlace[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const rows = (req.result as FavoritePlace[]) || [];
        rows.sort((a, b) => b.savedAt - a.savedAt);
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return lsRead().sort((a, b) => b.savedAt - a.savedAt);
  }
}

export async function isFavorite(id: string): Promise<boolean> {
  const all = await listFavorites();
  return all.some((f) => f.id === id);
}

export async function addFavorite(place: Omit<FavoritePlace, 'savedAt'>): Promise<void> {
  const item: FavoritePlace = { ...place, savedAt: Date.now() };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const all = lsRead().filter((f) => f.id !== item.id);
    all.unshift(item);
    lsWrite(all);
  }
}

export async function removeFavorite(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    lsWrite(lsRead().filter((f) => f.id !== id));
  }
}

export async function toggleFavorite(
  place: Omit<FavoritePlace, 'savedAt'>
): Promise<boolean> {
  if (await isFavorite(place.id)) {
    await removeFavorite(place.id);
    return false;
  }
  await addFavorite(place);
  return true;
}
