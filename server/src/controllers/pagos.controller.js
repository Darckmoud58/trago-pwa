import mongoose from 'mongoose';
import Ubicacion from '../models/Ubicacion.js';
import Pago from '../models/Pago.js';
import {
  ownedPositions,
  ownedWindows,
  quotePositionPurchase,
  quoteSlotPurchase,
  slotsFromLegacy,
} from '../lib/pagosPricing.js';
import { findActivePautaSub } from '../lib/pauta.js';
import {
  assertGateway,
  confirmPayPalPayment,
  createCheckoutSession,
  gatewayStatus,
  moneyMatches,
  mpSandboxReady,
  newSandboxToken,
  pagosConfigured,
  publicFrontOrigin,
  resolvePagosProvider,
} from '../lib/pagosProvider.js';
import { activarPagoAprobado } from '../services/activarPago.js';

function assertOwnEmpresa(req) {
  if (!req.empresa) {
    const err = new Error('NO_EMPRESA');
    err.status = 404;
    throw err;
  }
  return req.empresa;
}

function mapPago(p) {
  if (!p) return null;
  return {
    _id: p._id,
    plan: p.plan,
    sucursales: p.sucursales,
    slot: p.slot || '',
    monto: p.monto,
    moneda: p.moneda,
    dias: p.dias,
    estatus: p.estatus,
    provider: p.provider,
    checkout_url: p.checkout_url,
    pagado_en: p.pagado_en,
    createdAt: p.createdAt,
  };
}

/** GET /api/cadena/pagos/cotizar?plan=&sucursales= */
export async function cotizarPago(req, res) {
  try {
    const empresa = assertOwnEmpresa(req);
    let sucursales = Number(req.query.sucursales);
    if (!Number.isFinite(sucursales) || sucursales < 1) {
      sucursales = await Ubicacion.countDocuments({
        id_empresa: empresa._id,
        estatus: 'activo',
      });
      if (sucursales < 1) sucursales = 1;
    }
    const plan = req.query.plan || 'basic';
    const sub = await findActivePautaSub(empresa._id);
    const owned = slotsFromLegacy(sub);
    const slot = String(req.query.slot || '');
    const kind = String(req.query.kind || '');
    let quote = null;
    if (slot) {
      try {
        quote =
          kind === 'posicion'
            ? quotePositionPurchase({
                position: slot,
                windows: ownedWindows(sub),
                positions: ownedPositions(sub),
              })
            : quoteSlotPurchase({ plan, sucursales, slot, owned });
      } catch (err) {
        return res.status(err.status || 400).json({
          message: err.message,
          owned,
          ventanas: ownedWindows(sub),
          posiciones: ownedPositions(sub),
        });
      }
    }
    return res.json({
      ...(quote || { plan, sucursales, moneda: 'MXN' }),
      owned,
      ventanas: ownedWindows(sub),
      posiciones: ownedPositions(sub),
      provider: resolvePagosProvider(),
      configured: pagosConfigured(),
      gateways: gatewayStatus(),
    });
  } catch (e) {
    if (e.status === 404 || e.message === 'NO_EMPRESA') {
      return res.status(404).json({ message: 'Registra tu cadena primero' });
    }
    console.error('cotizarPago:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/** POST /api/cadena/pagos/checkout { plan?, sucursales? } */
export async function crearCheckout(req, res) {
  try {
    const empresa = assertOwnEmpresa(req);
    if (!pagosConfigured()) {
      return res.status(503).json({
        message:
          'Pasarela no configurada. Usa PAGOS_PROVIDER=sandbox o MP_ACCESS_TOKEN.',
      });
    }

    let sucursales = Number(req.body.sucursales);
    if (!Number.isFinite(sucursales) || sucursales < 1) {
      sucursales = await Ubicacion.countDocuments({
        id_empresa: empresa._id,
        estatus: 'activo',
      });
      if (sucursales < 1) sucursales = 1;
    }

    const requested = String(req.body?.provider || '')
      .trim()
      .toLowerCase();
    const provider =
      requested === 'paypal' || requested === 'mercadopago'
        ? requested
        : resolvePagosProvider();
    if (provider === 'paypal' || provider === 'mercadopago') {
      assertGateway(provider);
    }
    const sub = await findActivePautaSub(empresa._id);
    const owned = slotsFromLegacy(sub);
    const kind = String(req.body?.kind || '');
    const requestedSlot = String(req.body.slot || '');
    let quote;
    try {
      quote =
        kind === 'posicion'
          ? quotePositionPurchase({
              position: requestedSlot,
              windows: ownedWindows(sub),
              positions: ownedPositions(sub),
            })
          : quoteSlotPurchase({
              plan: req.body.plan || 'basic',
              sucursales,
              slot: requestedSlot,
              owned,
            });
    } catch (err) {
      return res.status(err.status || 400).json({ message: err.message, owned });
    }
    const sandbox_token = newSandboxToken();

    const pago = await Pago.create({
      id_empresa: empresa._id,
      plan: quote.plan,
      sucursales: quote.sucursales,
      slot: quote.slot,
      monto: quote.monto,
      moneda: quote.moneda,
      dias: quote.dias,
      estatus: 'pending',
      provider,
      sandbox_token,
      meta: {
        empresaNombre: empresa.nombre,
        kind: quote.kind === 'posicion' ? 'posicion' : 'ventana',
      },
    });

    const session = await createCheckoutSession({
      pagoId: String(pago._id),
      sandboxToken: sandbox_token,
      plan: quote.plan,
      sucursales: quote.sucursales,
      monto: quote.monto,
      moneda: quote.moneda,
      slot: quote.slot,
      empresaNombre: empresa.nombre,
      provider,
    });

    pago.provider_ref = session.provider_ref;
    pago.checkout_url = session.checkout_url;
    await pago.save();

    return res.status(201).json({
      pago: mapPago(pago.toObject()),
      quote,
      checkout_url: session.checkout_url,
      mode: session.mode,
      message:
        session.mode === 'paypal_sandbox'
          ? 'PayPal sandbox listo. Inicia sesión con el comprador de prueba.'
          : session.mode === 'mp_sandbox'
            ? 'Mercado Pago sandbox listo. Inicia sesión con el comprador de prueba.'
            : 'Sandbox listo: abre checkout_url para simular el pago.',
    });
  } catch (e) {
    if (e.status === 404 || e.message === 'NO_EMPRESA') {
      return res.status(404).json({ message: 'Registra tu cadena primero' });
    }
    console.error('crearCheckout:', e.message, e.detail || '');
    return res
      .status(e.status || 500)
      .json({ message: e.message || 'Error del servidor' });
  }
}

/**
 * GET /api/pagos/sandbox/:pagoId — detalle público con token
 * query: token=
 */
export async function getSandboxPago(req, res) {
  try {
    const { pagoId } = req.params;
    const token = String(req.query.token || '');
    if (!mongoose.isValidObjectId(pagoId) || !token) {
      return res.status(400).json({ message: 'pago y token requeridos' });
    }
    const pago = await Pago.findById(pagoId).lean();
    if (!pago || pago.sandbox_token !== token) {
      return res.status(404).json({ message: 'Pago sandbox no encontrado' });
    }
    return res.json({
      pago: mapPago(pago),
      quote: quoteSubscription(pago.plan, pago.sucursales),
      canApprove: pago.estatus === 'pending' && pago.provider === 'sandbox',
    });
  } catch (e) {
    console.error('getSandboxPago:', e.message);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}

/**
 * POST /api/pagos/sandbox/:pagoId/aprobar
 * body/query: { token }
 */
export async function aprobarSandbox(req, res) {
  try {
    const { pagoId } = req.params;
    const token = String(req.body?.token || req.query.token || '');
    if (!mongoose.isValidObjectId(pagoId) || !token) {
      return res.status(400).json({ message: 'pago y token requeridos' });
    }
    const pago = await Pago.findById(pagoId);
    if (!pago || pago.sandbox_token !== token) {
      return res.status(404).json({ message: 'Pago sandbox no encontrado' });
    }
    if (pago.provider !== 'sandbox') {
      return res.status(400).json({ message: 'Este pago no es sandbox' });
    }
    if (pago.estatus !== 'pending' && pago.estatus !== 'approved') {
      return res.status(409).json({ message: `Pago en estatus ${pago.estatus}` });
    }

    const result = await activarPagoAprobado(pago, {
      notas: 'Aprobado en sandbox TraGo',
    });
    return res.json({
      ok: true,
      already: result.already,
      pago: mapPago(result.pago),
      suscripcion: result.suscripcion,
      message: result.already
        ? 'Pago ya estaba aprobado.'
        : 'Pago sandbox aprobado. Pauta activada.',
    });
  } catch (e) {
    console.error('aprobarSandbox:', e.message);
    return res
      .status(e.status || 500)
      .json({ message: e.message || 'Error del servidor' });
  }
}

/**
 * POST /api/pagos/webhook/mercadopago
 * Notificación MP (topic=payment). En sandbox local no se usa.
 */
export async function webhookMercadoPago(req, res) {
  try {
    const topic = req.query.topic || req.query.type || req.body?.type;
    const id =
      req.query['data.id'] ||
      req.query.id ||
      req.body?.data?.id ||
      req.body?.id;

    // Ack rápido; procesamos si hay token
    const mpToken = String(process.env.MP_ACCESS_TOKEN || '');
    if (!mpSandboxReady()) {
      return res.status(200).json({ ok: true, skipped: 'sandbox_only' });
    }

    if (String(topic).includes('payment') && id) {
      const payRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${id}`,
        {
          headers: { Authorization: `Bearer ${mpToken}` },
        }
      );
      const payment = await payRes.json().catch(() => ({}));
      if (
        payment.status === 'approved' &&
        payment.live_mode === false &&
        payment.external_reference
      ) {
        const pago = await Pago.findById(payment.external_reference);
        const amountOk =
          pago &&
          pago.provider === 'mercadopago' &&
          moneyMatches(
            pago.monto,
            payment.transaction_amount,
            payment.currency_id
          );
        if (pago && pago.estatus === 'pending' && amountOk) {
          pago.provider_ref = String(payment.id || pago.provider_ref);
          pago.meta = {
            ...(pago.meta || {}),
            mp_status: payment.status,
            mp_payment_id: payment.id,
          };
          await activarPagoAprobado(pago, {
            notas: `MP payment ${payment.id}`,
          });
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('webhookMercadoPago:', e.message);
    // MP reintenta si no es 2xx; devolvemos 200 para no ciclar en errores nuestros
    return res.status(200).json({ ok: false });
  }
}

function frontPago(status) {
  return `${publicFrontOrigin()}/cadena?pago=${status}`;
}

/**
 * GET /api/pagos/paypal/retorno?pago=&token=
 * PayPal agrega token=ORDER_ID tras el login del comprador de prueba.
 */
export async function retornoPayPal(req, res) {
  try {
    const { pago: pagoId } = req.query;
    const orderId = String(req.query.token || '');
    if (!mongoose.isValidObjectId(pagoId)) {
      return res.redirect(302, frontPago('fail'));
    }
    const pago = await Pago.findById(pagoId);
    if (!pago || pago.provider !== 'paypal') {
      return res.redirect(302, frontPago('fail'));
    }
    if (pago.estatus === 'approved') {
      return res.redirect(302, frontPago('ok'));
    }
    const order = await confirmPayPalPayment({ pago, orderId });
    pago.provider_ref = String(order.id || orderId);
    pago.meta = { ...(pago.meta || {}), paypal_status: order.status };
    await activarPagoAprobado(pago, { notas: `PayPal sandbox ${order.id}` });
    return res.redirect(302, frontPago('ok'));
  } catch (e) {
    console.error('retornoPayPal:', e.message);
    return res.redirect(302, frontPago('fail'));
  }
}

/**
 * POST /api/pagos/webhook/paypal
 * No confía en el cuerpo: vuelve a leer la orden en el sandbox.
 */
export async function webhookPayPal(req, res) {
  try {
    const event = String(req.body?.event_type || '');
    const resource = req.body?.resource || {};
    const orderId =
      resource?.supplementary_data?.related_ids?.order_id ||
      (event.startsWith('CHECKOUT.ORDER') ? resource.id : '');
    const pagoId = resource.custom_id || resource.purchase_units?.[0]?.custom_id;
    if (!orderId || !mongoose.isValidObjectId(pagoId)) {
      return res.status(200).json({ ok: true, skipped: 'no_ref' });
    }
    const pago = await Pago.findById(pagoId);
    if (!pago || pago.provider !== 'paypal' || pago.estatus !== 'pending') {
      return res.status(200).json({ ok: true, skipped: 'pago' });
    }
    const order = await confirmPayPalPayment({ pago, orderId: String(orderId) });
    pago.provider_ref = String(order.id || orderId);
    pago.meta = { ...(pago.meta || {}), paypal_status: order.status };
    await activarPagoAprobado(pago, { notas: `PayPal webhook ${order.id}` });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('webhookPayPal:', e.message);
    return res.status(200).json({ ok: false });
  }
}
