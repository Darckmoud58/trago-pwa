import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { birthDateIso, isBirthdayToday } from './birthday.js';

describe('birthday', () => {
  it('birthDateIso usa UTC (fecha_nacimiento a mediodía Z)', () => {
    const d = new Date('2000-03-15T12:00:00.000Z');
    assert.equal(birthDateIso(d), '2000-03-15');
  });

  it('isBirthdayToday con ISO y Date UTC', () => {
    const now = new Date('2026-03-15T18:00:00.000Z'); // tarde CDMX 15 mar
    assert.equal(isBirthdayToday('2000-03-15', now), true);
    assert.equal(
      isBirthdayToday(new Date('2000-03-15T12:00:00.000Z'), now),
      true
    );
    assert.equal(isBirthdayToday('2000-03-16', now), false);
  });

  it('29 feb → 1 mar en año no bisiesto', () => {
    const now = new Date('2025-03-01T18:00:00.000Z');
    assert.equal(isBirthdayToday('2000-02-29', now), true);
  });
});
