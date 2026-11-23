import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPromoSearchClause,
  escapeRegex,
  promoSearchRegex,
} from './catalogSearch.js';

describe('catalogSearch', () => {
  it('escapa metacaracteres', () => {
    assert.equal(escapeRegex('a+b(c)'), 'a\\+b\\(c\\)');
    assert.equal(promoSearchRegex('a'), null);
    assert.equal(String(promoSearchRegex('oxxo')), '/oxxo/i');
  });

  it('arma cláusula por nombre y por empresa', () => {
    const rx = promoSearchRegex('OXXO');
    const clause = buildPromoSearchClause(rx, ['empresa-1']);
    assert.equal(clause.$or.length, 3);
    assert.equal(clause.$or[2].id_empresa.$in[0], 'empresa-1');
  });
});
