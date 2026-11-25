import assert from 'node:assert/strict';
import test from 'node:test';
import { assertAdSchedule, parseAdDate } from './adSchedule.js';

test('la fecha final incluye la noche de Guadalajara', () => {
  const start = parseAdDate('2026-11-24');
  const end = parseAdDate('2026-11-24', true);
  assert.equal(start.toISOString(), '2026-11-24T06:00:00.000Z');
  assert.equal(end.toISOString(), '2026-11-25T05:59:59.999Z');
  assert.doesNotThrow(() => assertAdSchedule(start, end, {
    publish: true, now: new Date('2026-11-25T05:48:00.000Z'),
  }));
});

test('rechaza días inválidos, intervalos invertidos y publicación vencida', () => {
  const end = parseAdDate('2026-11-24', true);
  assert.throws(() => parseAdDate('2026-02-30'), /fecha válida/);
  assert.throws(() => assertAdSchedule(parseAdDate('2026-11-25'), end), /posterior/);
  assert.throws(() => assertAdSchedule(null, end, {
    publish: true, now: new Date('2026-11-25T06:00:00Z'),
  }), /ya pasó/);
  assert.equal(parseAdDate('2026-11-24T20:00:00Z', true).toISOString(), '2026-11-24T20:00:00.000Z');
});
