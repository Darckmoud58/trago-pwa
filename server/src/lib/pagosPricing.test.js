import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  quoteSubscription,
  quoteSlotPurchase,
  slotsFromLegacy,
  PLAN_BASE_MXN,
} from './pagosPricing.js';
import {
  resolvePagosProvider,
  pagosConfigured,
  gatewayStatus,
  paypalApproveLink,
  paypalOrderMatches,
  moneyMatches,
} from './pagosProvider.js';

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

describe('quoteSlotPurchase', () => {
  it('el primer campo usa el plan con sucursales', () => {
    const q = quoteSlotPurchase({
      plan: 'basic',
      sucursales: 2,
      slot: 'home_rail',
      owned: [],
    });
    assert.equal(q.kind, 'primer_campo');
    assert.equal(q.monto, PLAN_BASE_MXN.basic + 500);
  });

  it('un campo extra cuesta el base y no repite las sucursales', () => {
    const q = quoteSlotPurchase({
      plan: 'basic',
      sucursales: 2,
      slot: 'cerca_top',
      owned: ['home_rail'],
    });
    assert.equal(q.kind, 'campo_extra');
    assert.equal(q.monto, PLAN_BASE_MXN.basic);
    assert.equal(q.extra, 0);
  });

  it('no vuelve a cobrar un campo que ya está pagado', () => {
    assert.throws(
      () =>
        quoteSlotPurchase({
          slot: 'home_rail',
          owned: ['home_rail'],
        }),
      /ya está pagado/
    );
  });

  it('un plan viejo sin campos guardados ya tiene Home', () => {
    assert.deepEqual(
      slotsFromLegacy({ activo: true, estatus: 'activo', slots: [] }),
      ['home_rail']
    );
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

  it('paypal sandbox solo con modo sandbox y ambas llaves', () => {
    assert.equal(
      resolvePagosProvider({
        PAGOS_PROVIDER: 'paypal',
        PAYPAL_CLIENT_ID: 'sb-client',
        PAYPAL_CLIENT_SECRET: 'sb-secret',
      }),
      'paypal'
    );
    assert.deepEqual(
      gatewayStatus({
        MP_ACCESS_TOKEN: 'TEST-abc',
        PAYPAL_MODE: 'live',
        PAYPAL_CLIENT_ID: 'live-client',
        PAYPAL_CLIENT_SECRET: 'live-secret',
      }),
      { mercadopago: true, paypal: false }
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

  it('solo acepta el enlace de aprobación de PayPal sandbox', () => {
    assert.equal(
      paypalApproveLink([
        {
          rel: 'approve',
          href: 'https://www.sandbox.paypal.com/checkoutnow?token=ABC',
        },
      ]),
      'https://www.sandbox.paypal.com/checkoutnow?token=ABC'
    );
    assert.equal(
      paypalApproveLink([
        { rel: 'approve', href: 'https://www.paypal.com/checkoutnow?token=ABC' },
      ]),
      ''
    );
  });

  it('el cobro de PayPal tiene que coincidir en monto, moneda y folio', () => {
    const pago = { _id: 'pago1', monto: 3400 };
    assert.equal(moneyMatches(3400, '3400.00', 'MXN'), true);
    assert.equal(moneyMatches(3400, '1.00', 'MXN'), false);
    assert.equal(
      paypalOrderMatches(
        {
          status: 'COMPLETED',
          purchase_units: [
            {
              custom_id: 'pago1',
              payments: {
                captures: [
                  { status: 'COMPLETED', amount: { currency_code: 'MXN', value: '3400.00' } },
                ],
              },
            },
          ],
        },
        pago
      ),
      true
    );
    assert.equal(
      paypalOrderMatches(
        {
          status: 'COMPLETED',
          purchase_units: [
            {
              custom_id: 'otro',
              payments: {
                captures: [
                  { status: 'COMPLETED', amount: { currency_code: 'MXN', value: '3400.00' } },
                ],
              },
            },
          ],
        },
        pago
      ),
      false
    );
  });
});
