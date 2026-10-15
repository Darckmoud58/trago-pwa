import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  gpsOkMatchExtra,
  normalizeSessionId,
  validateMetricEvent,
} from './metricasValidate.js';

const SID = 'sess-demo-01';
const PROMO = '507f1f77bcf86cd799439011';
const UBIC = '507f1f77bcf86cd799439012';
const EMP = '507f1f77bcf86cd799439013';

describe('normalizeSessionId', () => {
  it('acepta UUID / tokens cortos y rechaza basura', () => {
    assert.equal(normalizeSessionId(SID), SID);
    assert.ok(normalizeSessionId('a'.repeat(8)));
    assert.equal(normalizeSessionId('short'), null);
    assert.equal(normalizeSessionId('bad id!'), null);
    assert.equal(normalizeSessionId(''), null);
  });
});

describe('validateMetricEvent R3', () => {
  it('gps_ok exige coords México', () => {
    const bad = validateMetricEvent({
      tipo: 'gps_ok',
      sessionId: SID,
    });
    assert.equal(bad.ok, false);

    const madrid = validateMetricEvent({
      tipo: 'gps_ok',
      sessionId: SID,
      lat: 40.4,
      lng: -3.7,
    });
    assert.equal(madrid.ok, false);

    const gdl = validateMetricEvent({
      tipo: 'gps_ok',
      sessionId: SID,
      lat: 20.67,
      lng: -103.35,
    });
    assert.equal(gdl.ok, true);
    assert.equal(gdl.doc.lat, 20.67);
  });

  it('ignora empresaId del cliente; usa mapa promo→empresa', () => {
    const r = validateMetricEvent(
      {
        tipo: 'promo_open',
        sessionId: SID,
        promoId: PROMO,
        empresaId: '507f1f77bcf86cd799439099',
      },
      { promoEmpresa: { [PROMO]: EMP } }
    );
    assert.equal(r.ok, true);
    assert.equal(String(r.doc.id_empresa), EMP);
  });

  it('promo_open / sucursal_vista exigen ids', () => {
    assert.equal(
      validateMetricEvent({ tipo: 'promo_open', sessionId: SID }).ok,
      false
    );
    assert.equal(
      validateMetricEvent({
        tipo: 'sucursal_vista',
        sessionId: SID,
        promoId: PROMO,
      }).ok,
      false
    );
    const ok = validateMetricEvent({
      tipo: 'sucursal_vista',
      sessionId: SID,
      promoId: PROMO,
      ubicacionId: UBIC,
    });
    assert.equal(ok.ok, true);
  });

  it('coords fuera de MX en cerca_open se descartan (evento sí)', () => {
    const r = validateMetricEvent({
      tipo: 'cerca_open',
      sessionId: SID,
      lat: 40.4,
      lng: -3.7,
    });
    assert.equal(r.ok, true);
    assert.equal(r.doc.lat, null);
    assert.equal(r.doc.lng, null);
  });
});

describe('gpsOkMatchExtra', () => {
  it('acota lat/lng a caja México', () => {
    const m = gpsOkMatchExtra();
    assert.equal(m.lat.$gte, 14);
    assert.equal(m.lng.$lte, -86);
  });
});
