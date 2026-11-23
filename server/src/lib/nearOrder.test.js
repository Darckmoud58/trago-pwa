import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  nearestMeters,
  sortBranchesByDistance,
  sortPromosByNearest,
} from './nearOrder.js';

describe('nearOrder', () => {
  it('pone primero la promo cuya sucursal está más cerca', () => {
    const sorted = sortPromosByNearest([
      {
        nombre: 'lejos',
        ubicacionesCercanas: [{ distanceMeters: 462 }, { distanceMeters: 800 }],
      },
      {
        nombre: 'cerca',
        ubicacionesCercanas: [{ distanceMeters: 900 }, { distanceMeters: 159 }],
      },
      { nombre: 'sin pin', ubicacionesCercanas: [] },
    ]);
    assert.deepEqual(
      sorted.map((p) => p.nombre),
      ['cerca', 'lejos', 'sin pin']
    );
    assert.equal(nearestMeters(sorted[0]), 159);
  });

  it('ordena las sucursales de una misma marca', () => {
    const rows = sortBranchesByDistance([
      { nombre: 'b', distanceMeters: 462 },
      { nombre: 'a', distanceMeters: 159 },
    ]);
    assert.equal(rows[0].nombre, 'a');
  });
});
