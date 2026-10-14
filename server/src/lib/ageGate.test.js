import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_ACCOUNT_AGE,
  MIN_ALCOHOL_AGE,
  bandFromAge,
  canSeeRestricted,
  filterPromosForViewer,
  isRestrictedPromo,
  parseBand,
  yearsFromBirth,
} from './ageGate.js';

describe('yearsFromBirth', () => {
  it('cumpleaños ya pasado este año', () => {
    const now = new Date('2026-10-14');
    assert.equal(yearsFromBirth('2000-01-01', now), 26);
  });

  it('cumpleaños aún no llega', () => {
    const now = new Date('2026-10-14');
    assert.equal(yearsFromBirth('2010-12-25', now), 15);
  });
});

describe('bandFromAge / parseBand', () => {
  it('adult vs teen', () => {
    assert.equal(bandFromAge(18), 'adult');
    assert.equal(bandFromAge(17), 'teen');
    assert.equal(parseBand('18+'), 'adult');
    assert.equal(parseBand('teen'), 'teen');
  });
});

describe('isRestrictedPromo', () => {
  it('marca alcohol, adulto y nocturno', () => {
    assert.equal(isRestrictedPromo({ alcohol: true }), true);
    assert.equal(isRestrictedPromo({ audiencia: 'adulto' }), true);
    assert.equal(isRestrictedPromo({ nocturno: true }), true);
    assert.equal(isRestrictedPromo({ alcohol: false, nocturno: false }), false);
  });
});

describe('filterPromosForViewer', () => {
  const list = [
    { nombre: 'agua', alcohol: false },
    { nombre: 'chela', alcohol: true },
    { nombre: 'antro', nocturno: true },
  ];

  it('teen no ve alcohol ni nocturno', () => {
    const out = filterPromosForViewer(list, { band: 'teen', canSeeAlcohol: false });
    assert.equal(out.length, 1);
    assert.equal(out[0].nombre, 'agua');
  });

  it('adult ve todo', () => {
    assert.equal(filterPromosForViewer(list, { band: 'adult' }).length, 3);
  });

  it('canSeeRestricted respeta constantes', () => {
    assert.equal(MIN_ACCOUNT_AGE, 13);
    assert.equal(MIN_ALCOHOL_AGE, 18);
    assert.equal(canSeeRestricted({ band: 'teen' }), false);
    assert.equal(canSeeRestricted({ age: 21 }), true);
  });
});
