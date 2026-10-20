import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS } from '../middleware/rateLimit.js';

describe('LIMITS R2 (alineados a legacy security-limits / Todo_pwa)', () => {
  it('login 5/15min, registro 5/h, cerca 20/min, api 120/min, metrics 30/min, age/cadena', () => {
    assert.equal(LIMITS.login.max, 5);
    assert.equal(LIMITS.login.windowMs, 15 * 60 * 1000);
    assert.equal(LIMITS.register.max, 5);
    assert.equal(LIMITS.register.windowMs, 60 * 60 * 1000);
    assert.equal(LIMITS.cerca.max, 20);
    assert.equal(LIMITS.cerca.windowMs, 60 * 1000);
    assert.equal(LIMITS.api.max, 120);
    assert.equal(LIMITS.metrics.max, 30);
    assert.equal(LIMITS.metrics.windowMs, 60 * 1000);
    assert.equal(LIMITS.age.max, 20);
    assert.equal(LIMITS.cadenaRegistro.max, 3);
  });
});

