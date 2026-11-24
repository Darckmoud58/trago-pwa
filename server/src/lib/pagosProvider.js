import crypto from 'node:crypto';
import { quoteSubscription } from './pagosPricing.js';

/** Host de la API de PayPal de prueba. Nunca el de producción. */
export const PAYPAL_SANDBOX_API = 'https://api-m.sandbox.paypal.com';

/**
 * Provider activo por defecto (checkout sin elección):
 * - sandbox (default)
 * - mercadopago si PAGOS_PROVIDER=mercadopago y el token es de prueba
 */
export function resolvePagosProvider(raw = process.env) {
  const forced = String(raw.PAGOS_PROVIDER || '')
    .trim()
    .toLowerCase();
  if (forced === 'sandbox' || forced === 'manual') return forced;
  if (forced === 'mercadopago' && mpSandboxReady(raw)) return 'mercadopago';
  if (forced === 'paypal' && paypalSandboxReady(raw)) return 'paypal';
  return 'sandbox';
}

export function mpSandboxReady(raw = process.env) {
  const mode = String(raw.MP_MODE || 'sandbox')
    .trim()
    .toLowerCase();
  if (mode === 'live' || mode === 'production' || mode === 'produccion') {
    return false;
  }
  const token = String(raw.MP_ACCESS_TOKEN || '').trim();
  // Credenciales de prueba: el panel nuevo las muestra como APP_USR- con la pestaña Prueba.
  // TEST- es el formato viejo. Producción queda apagada con MP_MODE=live.
  return token.startsWith('TEST-') || token.startsWith('APP_USR-');
}

export function paypalSandboxReady(raw = process.env) {
  const mode = String(raw.PAYPAL_MODE || 'sandbox')
    .trim()
    .toLowerCase();
  if (mode !== 'sandbox') return false;
  const id = String(raw.PAYPAL_CLIENT_ID || '').trim();
  const secret = String(raw.PAYPAL_CLIENT_SECRET || '').trim();
  return Boolean(id && secret);
}

export function gatewayStatus(raw = process.env) {
  return {
    mercadopago: mpSandboxReady(raw),
    paypal: paypalSandboxReady(raw),
  };
}

export function pagosConfigured(raw = process.env) {
  const provider = resolvePagosProvider(raw);
  if (provider === 'sandbox' || provider === 'manual') return true;
  if (provider === 'paypal') return paypalSandboxReady(raw);
  return mpSandboxReady(raw);
}

export function assertGateway(provider, raw = process.env) {
  if (provider === 'mercadopago' && !mpSandboxReady(raw)) {
    const err = new Error(
      'Falta el Access Token de Credenciales de prueba de Mercado Pago. Producción no está habilitada.'
    );
    err.status = 503;
    throw err;
  }
  if (provider === 'paypal' && !paypalSandboxReady(raw)) {
    const err = new Error(
      'Faltan el Client ID y el Secret de PayPal sandbox. PAYPAL_MODE tiene que ser sandbox.'
    );
    err.status = 503;
    throw err;
  }
}

function frontOrigin(raw = process.env) {
  return (
    String(raw.APP_ORIGIN || raw.CORS_ORIGINS || 'http://localhost:5173')
      .split(',')[0]
      ?.trim() || 'http://localhost:5173'
  );
}

export function publicFrontOrigin(raw = process.env) {
  return frontOrigin(raw).replace(/\/$/, '');
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
export function moneyMatches(expected, value, currency) {
  const got = Number(value);
  const want = Number(expected);
  if (!Number.isFinite(got) || !Number.isFinite(want)) return false;
  if (String(currency || '').toUpperCase() !== 'MXN') return false;
  return Math.abs(got - want) < 0.001;
}

/** Solo acepta el enlace de aprobación del sandbox de PayPal. */
export function paypalApproveLink(links = []) {
  const link =
    links.find((item) => item?.rel === 'payer-action') ||
    links.find((item) => item?.rel === 'approve');
  let url;
  try {
    url = new URL(String(link?.href || ''));
  } catch {
    return '';
  }
  if (url.protocol !== 'https:' || url.hostname !== 'www.sandbox.paypal.com') {
    return '';
  }
  return url.toString();
}

export function paypalOrderMatches(order, pago) {
  if (!order || order.status !== 'COMPLETED' || !pago) return false;
  const unit = order.purchase_units?.[0];
  const custom = String(unit?.custom_id || unit?.reference_id || '');
  if (custom !== String(pago._id)) return false;
  const capture = unit?.payments?.captures?.find(
    (item) => item?.status === 'COMPLETED'
  );
  const amount = capture?.amount || unit?.amount;
  return moneyMatches(pago.monto, amount?.value, amount?.currency_code);
}

async function paypalAccessToken(raw) {
  const id = String(raw.PAYPAL_CLIENT_ID || '').trim();
  const secret = String(raw.PAYPAL_CLIENT_SECRET || '').trim();
  const res = await fetch(`${PAYPAL_SANDBOX_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(12000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const err = new Error('PayPal sandbox no dio token');
    err.status = 502;
    throw err;
  }
  return data.access_token;
}

async function paypalFetch(token, path, { method = 'GET', body, requestId } = {}) {
  const res = await fetch(`${PAYPAL_SANDBOX_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function confirmPayPalPayment({ pago, orderId }, raw = process.env) {
  assertGateway('paypal', raw);
  if (!orderId || !/^[A-Z0-9]{6,40}$/.test(String(orderId))) {
    const err = new Error('Orden de PayPal inválida');
    err.status = 400;
    throw err;
  }
  const token = await paypalAccessToken(raw);
  let { ok, data } = await paypalFetch(token, `/v2/checkout/orders/${orderId}`);
  if (!ok) {
    const err = new Error(data?.message || 'PayPal no encontró la orden');
    err.status = 502;
    throw err;
  }
  if (data.status === 'APPROVED') {
    const captured = await paypalFetch(
      token,
      `/v2/checkout/orders/${orderId}/capture`,
      { method: 'POST', body: {}, requestId: `capture-${pago._id}` }
    );
    if (!captured.ok && captured.data?.name !== 'ORDER_ALREADY_CAPTURED') {
      const err = new Error(
        captured.data?.message || 'PayPal no capturó el pago de prueba'
      );
      err.status = 502;
      throw err;
    }
    if (captured.ok) data = captured.data;
    else {
      const again = await paypalFetch(token, `/v2/checkout/orders/${orderId}`);
      data = again.data;
    }
  }
  if (!paypalOrderMatches(data, pago)) {
    const err = new Error('El cobro de PayPal no coincide con la cotización');
    err.status = 409;
    throw err;
  }
  return data;
}

export async function createCheckoutSession(opts, raw = process.env) {
  const provider = opts.provider || resolvePagosProvider(raw);
  const quote = quoteSubscription(opts.plan, opts.sucursales);
  const amount = Number.isFinite(Number(opts.monto)) ? Number(opts.monto) : quote.monto;
  const description = opts.slot
    ? `TraGo campo publicitario ${opts.slot}`
    : `TraGo ${quote.plan} · ${quote.sucursales} sucursales`;
  const front = frontOrigin(raw);

  if (provider === 'paypal') {
    assertGateway('paypal', raw);
    const token = await paypalAccessToken(raw);
    const created = await paypalFetch(token, '/v2/checkout/orders', {
      method: 'POST',
      requestId: `order-${opts.pagoId}`,
      body: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: String(opts.pagoId),
            custom_id: String(opts.pagoId),
            description,
            amount: {
              currency_code: 'MXN',
              value: amount.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: 'TraGo',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: `${apiOrigin(raw)}/api/pagos/paypal/retorno?pago=${encodeURIComponent(opts.pagoId)}`,
          cancel_url: `${front}/cadena?pago=cancel`,
        },
      },
    });
    const checkout_url = paypalApproveLink(created.data?.links);
    if (!created.ok || !checkout_url) {
      const err = new Error(
        created.data?.message || 'PayPal sandbox no creó la orden'
      );
      err.status = 502;
      err.detail = created.data;
      throw err;
    }
    return {
      provider: 'paypal',
      provider_ref: String(created.data.id || ''),
      checkout_url,
      quote,
      mode: 'paypal_sandbox',
    };
  }

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

  // Mercado Pago Checkout Pro. Solo el init point de sandbox.
  assertGateway('mercadopago', raw);
  const accessToken = raw.MP_ACCESS_TOKEN;
  const notificationUrl = `${apiOrigin(raw)}/api/pagos/webhook/mercadopago`;
  const body = {
    items: [
      {
        title: description,
        quantity: 1,
        currency_id: quote.moneda,
        unit_price: amount,
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

  let checkout_url = '';
  try {
    const parsed = new URL(String(data.sandbox_init_point || ''));
    if (
      parsed.protocol === 'https:' &&
      parsed.hostname.startsWith('sandbox.mercadopago.')
    ) {
      checkout_url = parsed.toString();
    }
  } catch {
    checkout_url = '';
  }
  if (!checkout_url) {
    const err = new Error('Mercado Pago no devolvió el checkout de prueba');
    err.status = 502;
    throw err;
  }
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
