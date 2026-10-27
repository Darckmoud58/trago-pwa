import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_ACCOUNT_AGE,
  MIN_ALCOHOL_AGE,
  bandFromAge,
  canSeeRestricted,
  canView,
  filterPromosForViewer,
  isRestrictedPromo,
  normalizeBand,
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
  it('adult vs minor', () => {
    assert.equal(bandFromAge(18), 'adult');
    assert.equal(bandFromAge(17), 'minor');
    assert.equal(parseBand('adult'), 'adult');
    assert.equal(parseBand('teen'), 'minor');
    assert.equal(normalizeBand('teen'), 'minor');
    assert.equal(normalizeBand('anon'), 'unknown');
  });
});

describe('isRestrictedPromo', () => {
  it('marca alcohol, adulto y nocturno', () => {
    assert.equal(isRestrictedPromo({ alcohol: true }), true);
    assert.equal(isRestrictedPromo({ audiencia: 'adulto' }), true);
    assert.equal(isRestrictedPromo({ nocturno: true }), true);
    assert.equal(isRestrictedPromo({ alcohol: false, nocturno: false }), false);
  });

  it('el texto de una cerveza cuenta como restringida aunque el flag esté apagado', () => {
    assert.equal(isRestrictedPromo({ nombre: 'Pacífico Clara Jalisco', alcohol: false }), true);
    assert.equal(isRestrictedPromo({ nombre: 'Michelob Ultra Jalisco', alcohol: false }), true);
    assert.equal(isRestrictedPromo({ nombre: 'Tecate Original Jalisco', alcohol: false }), true);
    assert.equal(isRestrictedPromo({ nombre: '2 Cones', alcohol: false }), false);
    assert.equal(
      isRestrictedPromo({ nombre: 'Refresco Frutal Sidral Mundet Light', alcohol: false }),
      false
    );
    assert.equal(
      isRestrictedPromo({
        nombre: 'Ginger Beer Fermentada Sin Alcohol 355 ml',
        alcohol: true,
        audiencia: 'adulto',
      }),
      false
    );
  });
});

describe('filterPromosForViewer M1', () => {
  const list = [
    { nombre: 'agua', alcohol: false },
    { nombre: 'chela', alcohol: true },
    { nombre: 'antro', nocturno: true },
  ];

  it('minor no ve restringidas', () => {
    const out = filterPromosForViewer(list, { band: 'minor' });
    assert.equal(out.length, 1);
    assert.equal(out[0].nombre, 'agua');
  });

  it('adult auth ve todo', () => {
    assert.equal(
      filterPromosForViewer(list, {
        band: 'adult',
        source: 'auth',
        userId: 'u1',
        age: 21,
      }).length,
      3
    );
  });

  it('cookie adult no ve alcohol: hace falta cuenta', () => {
    assert.equal(
      canSeeRestricted({ band: 'adult', source: 'cookie', age: 18 }),
      false
    );
    assert.equal(
      filterPromosForViewer(list, { band: 'adult', source: 'cookie' }).length,
      1
    );
  });

  it('unknown no ve restringidas', () => {
    assert.equal(canSeeRestricted({ band: 'unknown' }), false);
    assert.equal(canView({ alcohol: true }, { band: 'unknown' }), false);
    assert.equal(filterPromosForViewer(list, { band: 'unknown' }).length, 1);
  });

  it('auth minor no ve aunque cookie diga adult', () => {
    assert.equal(
      canSeeRestricted({
        band: 'minor',
        source: 'auth',
        userId: 'u',
        age: 16,
      }),
      false
    );
  });

  it('constantes', () => {
    assert.equal(MIN_ACCOUNT_AGE, 13);
    assert.equal(MIN_ALCOHOL_AGE, 18);
  });
});
