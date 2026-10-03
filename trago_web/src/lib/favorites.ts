import { api } from '../api';

/** Favoritos por cuenta, con espejo local y cola de sincronización offline. */
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

type StoredFavorite = FavoritePlace & { ownerKey: string; targetId: string; id: string };
type PendingChange = { key: string; ownerKey: string; op: 'put' | 'delete'; type: FavoritePlace['type']; id: string; favorite?: FavoritePlace };

const DB_NAME = 'trago-offline';
const DB_VERSION = 3;
const STORE = 'favoritos';
const QUEUE = 'favoritos_pendientes';
const LS_KEY = 'trago_favoritos_v1';
let activeSync: Promise<void> | null = null;

function ownerKey() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return 'guest';
    const encoded = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!encoded) return 'guest';
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    return payload.id || payload.sub ? `user:${payload.id || payload.sub}` : 'guest';
  } catch {
    return 'guest';
  }
}

function hasSession() {
  return Boolean(localStorage.getItem('token')) && ownerKey() !== 'guest';
}

function recordKey(user: string, type: FavoritePlace['type'], id: string) {
  return `${user}|${type}|${id}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no-idb'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'key' });
      if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function legacyGuestFavorites(): FavoritePlace[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as FavoritePlace[]; }
  catch { return []; }
}
function lsKey(user: string) { return `${LS_KEY}_${encodeURIComponent(user)}`; }
function readFallback(user: string): FavoritePlace[] {
  try {
    const rows = JSON.parse(localStorage.getItem(lsKey(user)) || '[]') as FavoritePlace[];
    return (user === 'guest' && rows.length === 0 ? legacyGuestFavorites() : rows)
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch { return []; }
}
function writeFallback(user: string, rows: FavoritePlace[]) {
  localStorage.setItem(lsKey(user), JSON.stringify(rows));
  if (user === 'guest') localStorage.setItem(LS_KEY, JSON.stringify(rows));
}
function fromStored(row: StoredFavorite | FavoritePlace): FavoritePlace {
  const saved = row as StoredFavorite;
  return { ...row, id: saved.targetId || row.id };
}

async function localRows(user = ownerKey()): Promise<FavoritePlace[]> {
  try {
    const db = await openDb();
    const rows = await new Promise<(StoredFavorite | FavoritePlace)[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    return rows
      .filter((row) => ((row as StoredFavorite).ownerKey || 'guest') === user)
      .map(fromStored)
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch { return readFallback(user); }
}

async function putLocal(place: FavoritePlace, user = ownerKey()) {
  const stored: StoredFavorite = {
    ...place,
    ownerKey: user,
    targetId: place.id,
    id: recordKey(user, place.type, place.id),
  };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(stored);
      if (user === 'guest') tx.objectStore(STORE).delete(place.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const rows = (await localRows(user)).filter((row) => !(row.id === place.id && row.type === place.type));
    writeFallback(user, [place, ...rows]);
  }
}

async function replaceLocal(rows: FavoritePlace[], user: string) {
  try {
    const db = await openDb();
    const existing = await new Promise<(StoredFavorite | FavoritePlace)[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const row of existing) {
        if (((row as StoredFavorite).ownerKey || 'guest') === user) store.delete(row.id);
      }
      for (const place of rows) {
        store.put({ ...place, ownerKey: user, targetId: place.id, id: recordKey(user, place.type, place.id) });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    writeFallback(user, rows);
  }
}

async function deleteLocal(placeType: FavoritePlace['type'], targetId: string, user = ownerKey()) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(recordKey(user, placeType, targetId));
      // Delete a pre-v3 guest record by its old key as well.
      if (user === 'guest') tx.objectStore(STORE).delete(targetId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    writeFallback(user, (await localRows(user)).filter((row) => !(row.id === targetId && row.type === placeType)));
  }
}

async function readQueue(user: string): Promise<PendingChange[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE, 'readonly');
      const req = tx.objectStore(QUEUE).getAll();
      req.onsuccess = () => resolve((req.result as PendingChange[]).filter((row) => row.ownerKey === user));
      req.onerror = () => reject(req.error);
    });
  } catch {
    try { return JSON.parse(localStorage.getItem(`${QUEUE}_${encodeURIComponent(user)}`) || '[]') as PendingChange[]; }
    catch { return []; }
  }
}

async function queueChange(change: Omit<PendingChange, 'key' | 'ownerKey'>, user = ownerKey()) {
  const row: PendingChange = { ...change, ownerKey: user, key: recordKey(user, change.type, change.id) };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE, 'readwrite');
      tx.objectStore(QUEUE).put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const rows = (await readQueue(user)).filter((item) => item.key !== row.key);
    localStorage.setItem(`${QUEUE}_${encodeURIComponent(user)}`, JSON.stringify([...rows, row]));
  }
}

function isSameChange(current: PendingChange, sent: PendingChange) {
  if (current.op !== sent.op) return false;
  if (current.op === 'delete') return true;
  return current.favorite?.savedAt === sent.favorite?.savedAt;
}

async function clearQueue(user: string, sent: PendingChange[]) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE, 'readwrite');
      const store = tx.objectStore(QUEUE);
      for (const change of sent) {
        const req = store.get(change.key);
        req.onsuccess = () => {
          const current = req.result as PendingChange | undefined;
          if (current && current.ownerKey === user && isSameChange(current, change)) store.delete(change.key);
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const key = `${QUEUE}_${encodeURIComponent(user)}`;
    const current = JSON.parse(localStorage.getItem(key) || '[]') as PendingChange[];
    localStorage.setItem(key, JSON.stringify(current.filter((row) => !sent.some((item) => item.key === row.key && isSameChange(row, item)))));
  }
}

/** Pull remote favorites, merge with local state, then flush offline edits/deletions. */
export async function syncFavorites(): Promise<void> {
  if (activeSync) return activeSync;
  const user = ownerKey();
  if (!hasSession() || !navigator.onLine) return;
  activeSync = (async () => {
    try {
      const [remoteResponse, pending] = await Promise.all([
        api.get('/api/favoritos'),
        readQueue(user),
      ]);
      const remote = (remoteResponse.data.favoritos || []) as FavoritePlace[];
      const deleted = new Set(pending.filter((c) => c.op === 'delete').map((c) => `${c.type}:${c.id}`));
      const merged = new Map<string, FavoritePlace>();
      for (const place of remote) merged.set(`${place.type}:${place.id}`, place);
      for (const key of deleted) merged.delete(key);
      for (const change of pending) {
        if (change.op === 'put' && change.favorite) merged.set(`${change.type}:${change.id}`, change.favorite);
      }
      const rows = [...merged.values()];
      await replaceLocal(rows, user);
      const changes = pending.map(({ op, type, id, favorite }) => ({ op, type, id, favorite }));
      if (changes.length) await api.post('/api/favoritos/sync', { changes });
      await clearQueue(user, pending);
    } catch {
      // Keep local favorites and queued operations; next online event retries them.
    }
  })().finally(() => { activeSync = null; });
  return activeSync;
}

export async function listFavorites(): Promise<FavoritePlace[]> {
  return localRows();
}

export async function isFavorite(id: string, type?: FavoritePlace['type']): Promise<boolean> {
  return (await listFavorites()).some((favorite) => favorite.id === id && (!type || favorite.type === type));
}

export async function addFavorite(place: Omit<FavoritePlace, 'savedAt'>): Promise<void> {
  const favorite: FavoritePlace = { ...place, savedAt: Date.now() };
  const user = ownerKey();
  await putLocal(favorite, user);
  await queueChange({ op: 'put', type: favorite.type, id: favorite.id, favorite }, user);
  void syncFavorites();
}

export async function removeFavorite(id: string, type?: FavoritePlace['type']): Promise<void> {
  const user = ownerKey();
  const existing = (await localRows(user)).filter((favorite) => favorite.id === id && (!type || favorite.type === type));
  for (const favorite of existing) {
    await deleteLocal(favorite.type, id, user);
    await queueChange({ op: 'delete', type: favorite.type, id }, user);
  }
  void syncFavorites();
}

export async function toggleFavorite(place: Omit<FavoritePlace, 'savedAt'>): Promise<boolean> {
  if (await isFavorite(place.id, place.type)) {
    await removeFavorite(place.id, place.type);
    return false;
  }
  await addFavorite(place);
  return true;
}
