import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parsePromoPrice, resolvePromoPrice } from './promoPrice.js';

describe('parsePromoPrice', () => {
  it('lee multipack 2X$48', () => {
    const p = parsePromoPrice('VARIEDAD DE MARUCHAN — 2X$48.00');
    assert.equal(p.precio, 48);
    assert.equal(p.multipack, 2);
    assert.match(p.precioTexto || '', /2× \$48/);
  });

  it('lee precio simple', () => {
    const p = parsePromoPrice('Lunch King $99');
    assert.equal(p.precio, 99);
    assert.equal(p.precioTexto, '$99');
  });

  it('no inventa sin cifra', () => {
    const p = parsePromoPrice('Dona Pikachu');
    assert.equal(p.precio, null);
    assert.equal(p.precioTexto, null);
  });
});

describe('resolvePromoPrice', () => {
  it('prioriza precio del scraper', () => {
    const p = resolvePromoPrice({
      precio: 35.5,
      precioLista: 50,
      title: 'Sin cifra en título',
    });
    assert.equal(p.precio, 35.5);
    assert.equal(p.precioLista, 50);
    assert.equal(p.precioTexto, '$35.50');
  });
});
