import mongoose from 'mongoose';
import { assertMexicoCoords } from './geoNear.js';
import { METRICA_EVENT_TYPES } from '../models/EventoMetrica.js';

/** sessionId cliente: UUID o token corto; evita basura / payloads enormes. */
const SESSION_RE = /^[A-Za-z0-9._:-]{8,80}$/;

/**
 * @param {unknown} raw
 * @returns {string|null}
 */
export function normalizeSessionId(raw) {
  const s = String(raw || '').trim();
  if (!SESSION_RE.test(s)) return null;
  return s;
}

/**
 * Valida un evento de beacon (R-03).
 * No confía en empresaId del cliente; solo ObjectIds y coords MX para gps_ok.
 *
 * @param {object} ev
 * @param {{ promoEmpresa?: Record<string, unknown> }} ctx
 * @returns {{ ok: true, doc: object } | { ok: false, reason: string }}
 */
export function validateMetricEvent(ev, ctx = {}) {
  if (!ev || typeof ev !== 'object') {
    return { ok: false, reason: 'evento inválido' };
  }

  const tipo = String(ev.tipo || '').trim();
  if (!METRICA_EVENT_TYPES.includes(tipo)) {
    return { ok: false, reason: 'tipo desconocido' };
  }

  const sessionId = normalizeSessionId(ev.sessionId);
  if (!sessionId) {
    return { ok: false, reason: 'sessionId inválido' };
  }

  let id_promo = null;
  let id_ubicacion = null;
  let id_empresa = null;

  if (ev.promoId != null && ev.promoId !== '') {
    if (!mongoose.isValidObjectId(ev.promoId)) {
      return { ok: false, reason: 'promoId inválido' };
    }
    id_promo = String(ev.promoId);
    const fromPromo = ctx.promoEmpresa?.[id_promo];
    if (fromPromo) id_empresa = fromPromo;
  }

  if (ev.ubicacionId != null && ev.ubicacionId !== '') {
    if (!mongoose.isValidObjectId(ev.ubicacionId)) {
      return { ok: false, reason: 'ubicacionId inválido' };
    }
    id_ubicacion = String(ev.ubicacionId);
  }

  if (tipo === 'promo_open' && !id_promo) {
    return { ok: false, reason: 'promo_open requiere promoId' };
  }
  if (tipo === 'sucursal_vista' && (!id_promo || !id_ubicacion)) {
    return {
      ok: false,
      reason: 'sucursal_vista requiere promoId y ubicacionId',
    };
  }

  const lat = Number(ev.lat);
  const lng = Number(ev.lng ?? ev.long);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  let outLat = null;
  let outLng = null;

  if (tipo === 'gps_ok') {
    if (!hasCoords) {
      return { ok: false, reason: 'gps_ok requiere lat/lng' };
    }
    const geo = assertMexicoCoords(lat, lng);
    if (!geo.ok) {
      return { ok: false, reason: geo.message || 'coords fuera de México' };
    }
    outLat = lat;
    outLng = lng;
  } else if (hasCoords) {
    const geo = assertMexicoCoords(lat, lng);
    if (geo.ok) {
      outLat = lat;
      outLng = lng;
    }
    // Fuera de MX: se acepta el evento sin coords (no inflar geo falsa).
  }

  let meta = {};
  if (ev.meta && typeof ev.meta === 'object' && !Array.isArray(ev.meta)) {
    try {
      const raw = JSON.stringify(ev.meta);
      if (raw.length <= 500) meta = ev.meta;
    } catch {
      meta = {};
    }
  }

  return {
    ok: true,
    doc: {
      tipo,
      sessionId,
      id_promo,
      id_ubicacion,
      id_empresa,
      lat: outLat,
      lng: outLng,
      path: String(ev.path || '').slice(0, 200),
      meta,
      /** Clave de dedupe servidor (sesión × tipo × promo × sucursal). */
      dedupeKey: `${sessionId}|${tipo}|${id_promo || ''}|${id_ubicacion || ''}`,
    },
  };
}

/** Match Mongo para gps_ok “limpio” (R-03 agregación). */
export function gpsOkMatchExtra() {
  return {
    lat: { $ne: null, $gte: 14, $lte: 33 },
    lng: { $ne: null, $gte: -119, $lte: -86 },
  };
}
