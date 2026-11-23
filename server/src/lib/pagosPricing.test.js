import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { quoteSubscription, PLAN_BASE_MXN } from './pagosPricing.js';
import { resolvePagosProvider, pagosConfigured } from './pagosProvider.js';

describe('quoteSubscription', () => {
  it('basic 1 sucursal = precio base', () => {
    const q = quoteSubscription('basic', 1);
    assert.equal(q.monto, PLAN_BASE_MXN.basic);
    assert.equal(q.extra, 0);
    assert.equal(q.moneda, 'MXN');
  });

  it('suma extra por sucursales adicionales', () => {
    const q = quoteSubscription('basic', 3);
    assert.equal(q.extra, 1000);
    assert.equal(q.monto, PLAN_BASE_MXN.basic + 1000);
  });

  it('plan desconocido cae a basic', () => {
    assert.equal(quoteSubscription('xyz', 1).plan, 'basic');
  });
});

describe('pagosProvider', () => {
  it('sandbox por defecto sin token', () => {
    assert.equal(resolvePagosProvider({}), 'sandbox');
    assert.equal(pagosConfigured({}), true);
  });

  it('mercadopago solo con token de prueba', () => {
    assert.equal(
      resolvePagosProvider({
        PAGOS_PROVIDER: 'mercadopago',
        MP_ACCESS_TOKEN: 'TEST-abc',
      }),
      'mercadopago'
    );
  });

  it('un token live o producción no sale del sandbox', () => {
    assert.equal(
      resolvePagosProvider({
        PAGOS_PROVIDER: 'mercadopago',
        MP_ACCESS_TOKEN: 'APP_USR-live',
        NODE_ENV: 'production',
      }),
      'sandbox'
    );
    assert.equal(
      resolvePagosProvider({
        MP_ACCESS_TOKEN: 'APP_USR-live',
        NODE_ENV: 'production',
      }),
      'sandbox'
    );
  });
});
