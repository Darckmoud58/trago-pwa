import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { vinculoMeta, enrichBranchesWithDistance } from '../services/promoBranchLinks.js';

describe('vinculoMeta', () => {
  it('sin vínculos no inventa', () => {
    const m = vinculoMeta(0, false);
    assert.equal(m.especificado, false);
    assert.match(m.mensaje, /no especifica/i);
  });

  it('con vínculos de cadena', () => {
    const m = vinculoMeta(2, false);
    assert.equal(m.especificado, true);
    assert.match(m.mensaje, /cadena/i);
  });

  it('con fuente', () => {
    const m = vinculoMeta(1, true);
    assert.equal(m.especificado, true);
  });
});

describe('enrichBranchesWithDistance', () => {
  it('ordena por distancia', () => {
    const rows = enrichBranchesWithDistance(
      [
        { _id: 'a', lat: 20.68, long: -103.35 },
        { _id: 'b', lat: 20.6767, long: -103.347 },
      ],
      { lat: 20.6767, lng: -103.347 }
    );
    assert.equal(rows[0]._id, 'b');
    assert.ok(rows[0].distanceMeters < rows[1].distanceMeters);
  });
});
