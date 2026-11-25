/** Última posición GPS compartida (splash / Home / Cerca / cumple). No inventa coords. */

export type LastKnownGps = {
  lat: number;
  lng: number;
  at: number;
};

const STORAGE_KEY = 'trago:last-known-gps';
const MEMORY_MAX_AGE_MS = 10 * 60 * 1000;

let memory: LastKnownGps | null = null;

function isValid(coords: LastKnownGps | null | undefined): coords is LastKnownGps {
  return Boolean(
    coords &&
      Number.isFinite(coords.lat) &&
      Number.isFinite(coords.lng) &&
      Number.isFinite(coords.at)
  );
}

function readPersisted(): LastKnownGps | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastKnownGps;
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writePersisted(coords: LastKnownGps) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
  } catch {
    /* private mode / quota */
  }
}

export function setLastKnownGps(lat: number, lng: number, at = Date.now()) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const next: LastKnownGps = { lat, lng, at };
  memory = next;
  writePersisted(next);
}

export function getLastKnownGps(opts?: {
  maxAgeMs?: number;
}): LastKnownGps | null {
  const maxAge = opts?.maxAgeMs ?? MEMORY_MAX_AGE_MS;
  const candidate = memory ?? readPersisted();
  if (!isValid(candidate)) return null;
  if (Date.now() - candidate.at > maxAge) return null;
  memory = candidate;
  return candidate;
}

export type ReadGpsCachedOptions = {
  forceDevice?: boolean;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  /** Edad máxima de la caché propia (session/memory). Default 10 min. */
  cacheMaxAgeMs?: number;
};

/**
 * Devuelve coords frescas de caché o pide al dispositivo y las guarda.
 * Rechaza solo si no hay caché válida y getCurrentPosition falla.
 */
export function readGpsCached(
  options: ReadGpsCachedOptions = {}
): Promise<LastKnownGps> {
  const cached = getLastKnownGps({
    maxAgeMs: options.cacheMaxAgeMs ?? MEMORY_MAX_AGE_MS,
  });
  if (cached && !options.forceDevice) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('no-geo'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: LastKnownGps = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          at: Date.now(),
        };
        setLastKnownGps(next.lat, next.lng, next.at);
        resolve(next);
      },
      (err) => reject(err ?? new Error('gps-denied')),
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 12_000,
        maximumAge: options.maximumAge ?? 60_000,
      }
    );
  });
}

export function isGeolocationError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  if (err instanceof GeolocationPositionError) return true;
  const code = (err as { code?: number }).code;
  const message = String((err as { message?: string }).message || '');
  if (message === 'no-geo' || message === 'gps-denied') return true;
  return code === 1 || code === 2 || code === 3;
}
