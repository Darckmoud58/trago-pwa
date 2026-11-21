import mongoose from 'mongoose';
import Ubicacion from '../models/Ubicacion.js';
import Pago from '../models/Pago.js';
import { quoteSubscription } from '../lib/pagosPricing.js';
import {
  createCheckoutSession,
  newSandboxToken,
  pagosConfigured,
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
    const quote = quoteSubscription(plan, sucursales);
    return res.json({
      ...quote,
      provider: resolvePagosProvider(),
      configured: pagosConfigured(),
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

    const quote = quoteSubscription(req.body.plan || 'basic', sucursales);
    const provider = resolvePagosProvider();
    const sandbox_token = newSandboxToken();

    const pago = await Pago.create({
      id_empresa: empresa._id,
      plan: quote.plan,
      sucursales: quote.sucursales,
      monto: quote.monto,
      moneda: quote.moneda,
      dias: quote.dias,
      estatus: 'pending',
      provider,
      sandbox_token,
      meta: { empresaNombre: empresa.nombre },
    });

    const session = await createCheckoutSession({
      pagoId: String(pago._id),
      sandboxToken: sandbox_token,
      plan: quote.plan,
      sucursales: quote.sucursales,
      monto: quote.monto,
      moneda: quote.moneda,
      empresaNombre: empresa.nombre,
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
        session.mode === 'sandbox'
          ? 'Sandbox listo: abre checkout_url para simular el pago.'
          : 'Preferencia creada. Completa el pago en Mercado Pago.',
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
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(200).json({ ok: true, skipped: 'no_token' });
    }

    if (String(topic).includes('payment') && id) {
      const payRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${id}`,
        {
          headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
        }
      );
      const payment = await payRes.json().catch(() => ({}));
      if (payment.status === 'approved' && payment.external_reference) {
        const pago = await Pago.findById(payment.external_reference);
        if (pago && pago.estatus === 'pending') {
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
