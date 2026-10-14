import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireChain } from '../middleware/roles.js';
import {
  getCadenaMetricas,
  getNorthStar,
  postEvents,
} from '../controllers/metricas.controller.js';
import { verifyAccessToken } from '../lib/jwt.js';

const router = Router();

/** Auth opcional: si hay Bearer válido, adjunta userId. */
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.id;
    req.role = payload.role;
  } catch {
    /* ignore invalid token for public beacon */
  }
  next();
}

router.post('/eventos', optionalAuth, postEvents);
router.get('/norte', auth, getNorthStar);
router.get('/cadena', auth, requireChain, getCadenaMetricas);

export default router;
