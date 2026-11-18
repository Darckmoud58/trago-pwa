import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseMoneyToken,
  parsePromoPrice,
  priceDisplayLabel,
  resolvePromoPrice,
} from './promoPrice.js';

describe('parseMoneyToken', () => {
  it('respeta miles con coma MX: 1,290.00 → 1290', () => {
    assert.equal(parseMoneyToken('1,290.00'), 1290);
    assert.equal(parseMoneyToken('$1,290.00'), 1290);
  });

  it('respeta formato EU 1.290,00 → 1290', () => {
    assert.equal(parseMoneyToken('1.290,00'), 1290);
  });

  it('lee decimales simples', () => {
    assert.equal(parseMoneyToken('99.50'), 99.5);
    assert.equal(parseMoneyToken('48'), 48);
  });
});

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
    assert.equal(p.modo, 'consultar');
  });

  it('BuonGiorno: no convierte “Hasta la 1 P.M.” en $1; conserva Desde $99', () => {
    const p = parsePromoPrice(
      'BuonGiorno Desayunos. Hasta la 1 P.M. Desayunos desde $99'
    );
    assert.equal(p.precio, 99);
    assert.equal(p.modo, 'desde');
    assert.match(p.precioTexto || '', /Desde \$99/i);
    assert.equal(p.precioLista, null);
  });

  it('Torres: $1,290.00 no se convierte en $129', () => {
    const p = parsePromoPrice(
      'Regalo Torres 20. Precio de regalo $1,290.00 en tienda.'
    );
    assert.equal(p.precio, 1290);
    assert.notEqual(p.precio, 129);
    assert.notEqual(p.precio, 1);
  });

  it('Lolea: montos múltiples sin evidencia → consultar (no inventa 40%)', () => {
    const p = parsePromoPrice(
      'Sangría Lolea N5 Rosé $379.00 -40% $227.40'
    );
    assert.equal(p.modo, 'consultar');
    assert.equal(p.precio, null);
    assert.equal(p.precioLista, null);
  });

  it('cargo +$5 no es precio total', () => {
    const p = parsePromoPrice('Recarga Cashi más $5.00');
    assert.equal(p.modo, 'cargo');
    assert.equal(p.precio, null);
    assert.match(p.precioTexto || '', /\+ \$5/);
  });

  it('no usa “de”/“a” sueltos como lista/ahora', () => {
    const p = parsePromoPrice('Hasta la 1 de la tarde promo a domicilio');
    assert.notEqual(p.precio, 1);
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

  it('respeta precioTexto Desde', () => {
    const p = resolvePromoPrice({
      precio: 99,
      precioTexto: 'Desde $99',
      title: 'BuonGiorno',
    });
    assert.match(p.precioTexto || '', /Desde/i);
  });

  it('etiqueta consultar cuando es ambiguo', () => {
    const p = resolvePromoPrice({
      title: 'Sangría',
      description: '$379.00 y también $227.40',
    });
    assert.equal(priceDisplayLabel(p), 'Consultar precio');
  });

  it('corrige precio almacenado $1 cuando el texto dice Desde $99', () => {
    const p = resolvePromoPrice({
      precio: 1,
      precioLista: 99,
      title: 'BuonGiorno Desayunos',
      description: 'Hasta la 1 P.M. Desayunos desde $99',
    });
    assert.equal(p.precio, 99);
    assert.equal(p.modo, 'desde');
  });

  it('corrige miles truncados 129 → 1290 desde texto', () => {
    const p = resolvePromoPrice({
      precio: 129,
      title: 'Regalo Torres 20',
      description: 'Precio $1,290.00',
    });
    assert.equal(p.precio, 1290);
  });
});
