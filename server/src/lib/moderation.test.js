import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearRateLimitBuckets,
  hitRateLimit,
  isFlipFlopAbuse,
  voteBanStatus,
  FLIPFLOP_MAX_PER_DAY,
} from './moderation.js';

describe('hitRateLimit', () => {
  beforeEach(() => clearRateLimitBuckets());

  it('bloquea al superar el límite', () => {
    const key = `test-${Date.now()}`;
    assert.equal(hitRateLimit(key, 2, 60_000).ok, true);
    assert.equal(hitRateLimit(key, 2, 60_000).ok, true);
    assert.equal(hitRateLimit(key, 2, 60_000).ok, false);
  });
});

describe('voteBanStatus', () => {
  it('bloquea cuenta estatus bloqueado', () => {
    const r = voteBanStatus({ estatus: 'bloqueado' });
    assert.equal(r.banned, true);
  });

  it('bloquea hasta fecha futura', () => {
    const until = new Date(Date.now() + 3600_000);
    const r = voteBanStatus({
      estatus: 'activo',
      reportes_bloqueado_hasta: until,
    });
    assert.equal(r.banned, true);
  });

  it('permite activo sin ban', () => {
    const r = voteBanStatus({ estatus: 'activo' });
    assert.equal(r.banned, false);
  });
});

describe('isFlipFlopAbuse', () => {
  it('no aplica sin voto previo', () => {
    assert.equal(isFlipFlopAbuse(null, true, 10), false);
  });

  it('detecta demasiados cambios', () => {
    assert.equal(
      isFlipFlopAbuse({ sigue_vigente: true }, false, FLIPFLOP_MAX_PER_DAY),
      true
    );
  });
});
