import crypto from 'node:crypto';
import { quoteSubscription } from './pagosPricing.js';

/**
 * Provider activo:
 * - sandbox (default en no-prod o sin token MP)
 * - mercadopago si PAGOS_PROVIDER=mercadopago y MP_ACCESS_TOKEN
 */
export function resolvePagosProvider(raw = process.env) {
  const forced = String(raw.PAGOS_PROVIDER || '')
    .trim()
    .toLowerCase();
  if (forced === 'sandbox' || forced === 'manual') return forced;
  const token = String(raw.MP_ACCESS_TOKEN || '');
  // Solo el token de prueba de Mercado Pago. Un token live no cobra desde aquí.
  if (forced === 'mercadopago' && token.startsWith('TEST-')) return 'mercadopago';
  return 'sandbox';
}

export function pagosConfigured(raw = process.env) {
  const provider = resolvePagosProvider(raw);
  if (provider === 'sandbox' || provider === 'manual') return true;
  return Boolean(raw.MP_ACCESS_TOKEN);
}

function frontOrigin(raw = process.env) {
  return (
    String(raw.APP_ORIGIN || raw.CORS_ORIGINS || 'http://localhost:5173')
      .split(',')[0]
      ?.trim() || 'http://localhost:5173'
  );
}

function apiOrigin(raw = process.env) {
  if (raw.API_PUBLIC_URL) return String(raw.API_PUBLIC_URL).replace(/\/$/, '');
  if (raw.VERCEL_URL) return `https://${raw.VERCEL_URL}`;
  return `http://127.0.0.1:${raw.PORT || 4000}`;
}

/**
 * @param {{
 *   pagoId: string,
 *   sandboxToken: string,
 *   plan: string,
 *   sucursales: number,
 *   monto: number,
 *   moneda: string,
 *   empresaNombre?: string,
 * }} opts
 */
export async function createCheckoutSession(opts, raw = process.env) {
  const provider = resolvePagosProvider(raw);
  const quote = quoteSubscription(opts.plan, opts.sucursales);
  const front = frontOrigin(raw);

  if (provider === 'sandbox' || provider === 'manual') {
    const checkout_url = `${front}/cadena/pago-sandbox?pago=${encodeURIComponent(
      opts.pagoId
    )}&token=${encodeURIComponent(opts.sandboxToken)}`;
    return {
      provider,
      provider_ref: `sandbox_${opts.pagoId}`,
      checkout_url,
      quote,
      mode: 'sandbox',
    };
  }

  // Mercado Pago Checkout Pro (sandbox con TEST- access token)
  const accessToken = raw.MP_ACCESS_TOKEN;
  const notificationUrl = `${apiOrigin(raw)}/api/pagos/webhook/mercadopago`;
  const body = {
    items: [
      {
        title: `TraGo ${quote.plan} · ${quote.sucursales} sucursal(es)`,
        quantity: 1,
        currency_id: quote.moneda,
        unit_price: quote.monto,
      },
    ],
    external_reference: String(opts.pagoId),
    notification_url: notificationUrl,
    back_urls: {
      success: `${front}/cadena?pago=ok`,
      failure: `${front}/cadena?pago=fail`,
      pending: `${front}/cadena?pago=pending`,
    },
    auto_return: 'approved',
    metadata: {
      plan: quote.plan,
      sucursales: quote.sucursales,
      trago_pago_id: opts.pagoId,
    },
  };

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      data?.message || data?.error || 'Mercado Pago no creó la preferencia'
    );
    err.status = 502;
    err.detail = data;
    throw err;
  }

  const checkout_url =
    data.sandbox_init_point || data.init_point || data.initPoint || '';
  return {
    provider: 'mercadopago',
    provider_ref: String(data.id || ''),
    checkout_url,
    quote,
    mode: 'mp_sandbox',
  };
}

export function newSandboxToken() {
  return crypto.randomBytes(24).toString('hex');
}
