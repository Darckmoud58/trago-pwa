import { Router } from 'express';
import { login, profile, register } from '../controllers/auth.controller.js';
import { auth } from '../middleware/auth.js';
import { LIMITS, rateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.post(
  '/register',
  rateLimit({
    name: 'register',
    max: LIMITS.register.max,
    windowMs: LIMITS.register.windowMs,
  }),
  register
);

router.post(
  '/login',
  rateLimit({
    name: 'login',
    max: LIMITS.login.max,
    windowMs: LIMITS.login.windowMs,
    keyFn: (req, ip) => {
      const mail = String(req.body?.email || req.body?.correo || '')
        .toLowerCase()
        .trim();
      return `rl:login:${ip}:${mail || 'none'}`;
    },
  }),
  login
);

router.get('/me', auth, profile);

export default router;
