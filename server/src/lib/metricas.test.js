import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { METRICA_EVENT_TYPES } from '../models/EventoMetrica.js';

describe('METRICA_EVENT_TYPES', () => {
  it('incluye los tres pilares de la métrica norte', () => {
    assert.ok(METRICA_EVENT_TYPES.includes('gps_ok'));
    assert.ok(METRICA_EVENT_TYPES.includes('promo_open'));
    assert.ok(METRICA_EVENT_TYPES.includes('sucursal_vista'));
  });
});

describe('funnel math', () => {
  it('calcula norte como intersección de sesiones', () => {
    const gps = new Set(['a', 'b', 'c']);
    const promo = new Set(['a', 'b', 'd']);
    const branch = new Set(['a', 'e']);
    let north = 0;
    for (const sid of gps) {
      if (promo.has(sid) && branch.has(sid)) north += 1;
    }
    assert.equal(north, 1);
  });
});

describe('R3 norte definition', () => {
  it('gps_ok sin coords MX no entra al set GPS del embudo', () => {
    const rows = [
      { sessionId: 'a', tipo: 'gps_ok', lat: 20.6, lng: -103.3 },
      { sessionId: 'b', tipo: 'gps_ok', lat: null, lng: null },
      { sessionId: 'c', tipo: 'gps_ok', lat: 40.4, lng: -3.7 },
    ];
    const gpsOk = rows.filter(
      (r) =>
        r.tipo === 'gps_ok' &&
        r.lat != null &&
        r.lng != null &&
        r.lat >= 14 &&
        r.lat <= 33 &&
        r.lng >= -119 &&
        r.lng <= -86
    );
    assert.deepEqual(
      gpsOk.map((r) => r.sessionId),
      ['a']
    );
  });
});
