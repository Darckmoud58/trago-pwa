import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireChain } from '../middleware/roles.js';
import { LIMITS, rateLimit } from '../middleware/rateLimit.js';
import {
  aprobarSandbox,
  cotizarPago,
  crearCheckout,
  getSandboxPago,
  retornoPayPal,
  webhookMercadoPago,
  webhookPayPal,
} from '../controllers/pagos.controller.js';

/** Montar en /api/cadena/pagos — JWT cadena */
export const pagosCadenaRouter = Router();

pagosCadenaRouter.get('/cotizar', auth, requireChain, cotizarPago);
pagosCadenaRouter.post(
  '/checkout',
  auth,
  requireChain,
  rateLimit({
    name: 'pagos-checkout',
    max: 10,
    windowMs: 60 * 60 * 1000,
    keyFn: (req, ip) => `rl:pagos-checkout:${req.userId || ip}`,
  }),
  crearCheckout
);

/** Público sandbox + webhook MP — montar en /api/pagos */
export const pagosPublicRouter = Router();

pagosPublicRouter.get('/sandbox/:pagoId', getSandboxPago);
pagosPublicRouter.post(
  '/sandbox/:pagoId/aprobar',
  rateLimit({
    name: 'pagos-sandbox-aprobar',
    max: LIMITS.login.max,
    windowMs: LIMITS.login.windowMs,
  }),
  aprobarSandbox
);
pagosPublicRouter.get('/paypal/retorno', retornoPayPal);
pagosPublicRouter.post('/webhook/mercadopago', webhookMercadoPago);
pagosPublicRouter.post('/webhook/paypal', webhookPayPal);

export default pagosPublicRouter;
