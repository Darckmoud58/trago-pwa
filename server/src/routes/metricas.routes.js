import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireAdmin, requireChain } from '../middleware/roles.js';
import { LIMITS, rateLimit } from '../middleware/rateLimit.js';
import {
  getCadenaMetricas,
  getNorthStar,
  postEvents,
} from '../controllers/metricas.controller.js';
import { verifyAccessToken } from '../lib/jwt.js';
import Usuario from '../models/Usuario.js';

const router = Router();

/** Auth opcional: Bearer válido + tokenVersion vigente; si no, beacon anónimo. */
async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await Usuario.findById(payload.id)
      .select('_id estatus tokenVersion')
      .lean();
    if (
      user &&
      user.estatus === 'activo' &&
      Number(payload.tv ?? 0) === Number(user.tokenVersion ?? 0)
    ) {
      req.userId = user._id;
    }
  } catch {
    /* ignore invalid token for public beacon */
  }
  next();
}

router.post(
  '/eventos',
  rateLimit({
    name: 'metrics',
    max: LIMITS.metrics.max,
    windowMs: LIMITS.metrics.windowMs,
    failClosed: false,
  }),
  optionalAuth,
  postEvents
);
/** Embudo global: solo admin (no filtrar datos de plataforma a cualquier sesión). */
router.get('/norte', auth, requireAdmin, getNorthStar);
router.get('/cadena', auth, requireChain, getCadenaMetricas);

export default router;
