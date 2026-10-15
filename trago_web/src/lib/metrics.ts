import { api } from '../api';

const SESSION_KEY = 'trago_metric_session';
const DEDUPE_PREFIX = 'trago_metric_once:';

export type MetricTipo =
  | 'gps_ok'
  | 'gps_fail'
  | 'cerca_open'
  | 'promo_open'
  | 'sucursal_vista';

export type MetricEvent = {
  tipo: MetricTipo;
  sessionId?: string;
  promoId?: string;
  ubicacionId?: string;
  empresaId?: string;
  lat?: number;
  lng?: number;
  path?: string;
  meta?: Record<string, unknown>;
};

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getMetricSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

/** Evita spamear el mismo evento clave en esta sesión (p. ej. misma promo). */
function onceKey(tipo: MetricTipo, key: string) {
  return `${DEDUPE_PREFIX}${tipo}:${key}`;
}

function alreadySent(tipo: MetricTipo, key: string) {
  try {
    return sessionStorage.getItem(onceKey(tipo, key)) === '1';
  } catch {
    return false;
  }
}

function markSent(tipo: MetricTipo, key: string) {
  try {
    sessionStorage.setItem(onceKey(tipo, key), '1');
  } catch {
    /* ignore */
  }
}

export async function track(event: MetricEvent, opts?: { onceKey?: string }) {
  if (opts?.onceKey && alreadySent(event.tipo, opts.onceKey)) return;
  const payload = {
    ...event,
    sessionId: event.sessionId || getMetricSessionId(),
    path: event.path || (typeof location !== 'undefined' ? location.pathname : ''),
  };
  try {
    await api.post('/api/metricas/eventos', payload);
    if (opts?.onceKey) markSent(event.tipo, opts.onceKey);
  } catch {
    /* beacon best-effort: no romper UX */
  }
}

export function trackGps(ok: boolean, lat?: number, lng?: number) {
  return track({
    tipo: ok ? 'gps_ok' : 'gps_fail',
    lat,
    lng,
    meta: { source: 'cerca' },
  });
}

export function trackPromoOpen(promoId: string, empresaId?: string) {
  return track(
    { tipo: 'promo_open', promoId, empresaId },
    { onceKey: promoId }
  );
}

export function trackSucursalVista(
  promoId: string,
  ubicacionId: string,
  empresaId?: string
) {
  return track(
    { tipo: 'sucursal_vista', promoId, ubicacionId, empresaId },
    { onceKey: `${promoId}:${ubicacionId}` }
  );
}
