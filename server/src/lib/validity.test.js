import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { crowdStatus, distanceMeters } from './validity.js';

describe('crowdStatus', () => {
  it('vigente por defecto', () => {
    assert.equal(
      crowdStatus({ officialActive: true, reportsVigente: 5, reportsCaduco: 1 }),
      'vigente'
    );
  });

  it('en_duda con mayoría caduco', () => {
    assert.equal(
      crowdStatus({ officialActive: true, reportsVigente: 1, reportsCaduco: 2 }),
      'en_duda'
    );
  });

  it('caduco con margen', () => {
    assert.equal(
      crowdStatus({ officialActive: true, reportsVigente: 1, reportsCaduco: 5 }),
      'caduco'
    );
  });

  it('fuera si no es oficial', () => {
    assert.equal(
      crowdStatus({ officialActive: false, reportsVigente: 10, reportsCaduco: 0 }),
      'fuera'
    );
  });
});

describe('distanceMeters', () => {
  it('cerca de cero en el mismo punto', () => {
    const d = distanceMeters(
      { lat: 20.6767, lng: -103.347 },
      { lat: 20.6767, lng: -103.347 }
    );
    assert.ok(d < 1);
  });

  it('aprox 400 m en GDL', () => {
    // ~0.0036° lat ≈ 400 m
    const d = distanceMeters(
      { lat: 20.6767, lng: -103.347 },
      { lat: 20.6767 + 0.0036, lng: -103.347 }
    );
    assert.ok(d > 350 && d < 450, `got ${d}`);
  });
});
