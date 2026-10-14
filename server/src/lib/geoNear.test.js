import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_NEAR_RADII,
  assertMexicoCoords,
  quantizeMaxMeters,
} from './geoNear.js';

describe('quantizeMaxMeters', () => {
  it('cuantiza a la lista fija', () => {
    assert.equal(quantizeMaxMeters(8000), 8000);
    assert.equal(quantizeMaxMeters(9000), 8000);
    assert.equal(quantizeMaxMeters(1200), 1000);
    assert.equal(quantizeMaxMeters('abc'), null);
    assert.ok(ALLOWED_NEAR_RADII.includes(quantizeMaxMeters(3000)));
  });
});

describe('assertMexicoCoords', () => {
  it('acepta GDL y rechaza Madrid', () => {
    assert.equal(assertMexicoCoords(20.67, -103.35).ok, true);
    const madrid = assertMexicoCoords(40.4, -3.7);
    assert.equal(madrid.ok, false);
    assert.equal(madrid.status, 422);
  });
});
