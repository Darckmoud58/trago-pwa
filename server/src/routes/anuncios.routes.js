import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireAdmin, requireChain } from '../middleware/roles.js';
import { LIMITS, rateLimit } from '../middleware/rateLimit.js';
import {
  activateAnuncio,
  adminUpsertSuscripcion,
  createAnuncio,
  listCadenaAnuncios,
  serveAnuncios,
  streamAdMedia,
  uploadAdMedia,
  solicitarSuscripcion,
  trackAnuncioEvento,
  updateAnuncio,
} from '../controllers/anuncios.controller.js';

/** Público + admin: montar en /api/anuncios */
export const anunciosPublicRouter = Router();

anunciosPublicRouter.get('/serving', serveAnuncios);
anunciosPublicRouter.get('/medios/:id', streamAdMedia);

anunciosPublicRouter.post(
  '/admin/suscripciones',
  auth,
  requireAdmin,
  adminUpsertSuscripcion
);

anunciosPublicRouter.post(
  '/:id/evento',
  rateLimit({
    name: 'anuncio-evento',
    max: LIMITS.metrics.max,
    windowMs: LIMITS.metrics.windowMs,
    keyFn: (_req, ip) => `rl:anuncio-evento:${ip}`,
  }),
  trackAnuncioEvento
);

/** Panel cadena: montar en /api/cadena/anuncios */
export const anunciosCadenaRouter = Router();

anunciosCadenaRouter.get('/', auth, requireChain, listCadenaAnuncios);
anunciosCadenaRouter.post(
  '/medios',
  auth,
  requireChain,
  rateLimit({
    name: 'anuncio-medio',
    max: 40,
    windowMs: 10 * 60 * 1000,
    keyFn: (req, ip) => `rl:anuncio-medio:${req.userId || ip}`,
  }),
  uploadAdMedia
);
anunciosCadenaRouter.post('/', auth, requireChain, createAnuncio);
anunciosCadenaRouter.post(
  '/suscripcion/solicitar',
  auth,
  requireChain,
  rateLimit({
    name: 'pauta-solicitar',
    max: 5,
    windowMs: 60 * 60 * 1000,
    keyFn: (req, ip) => `rl:pauta-solicitar:${req.userId || ip}`,
  }),
  solicitarSuscripcion
);
anunciosCadenaRouter.post(
  '/:id/activar',
  auth,
  requireChain,
  activateAnuncio
);
anunciosCadenaRouter.put('/:id', auth, requireChain, updateAnuncio);

export default anunciosPublicRouter;
