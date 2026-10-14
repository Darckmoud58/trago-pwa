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
