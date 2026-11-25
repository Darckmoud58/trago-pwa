import { Router } from 'express';
import {
  login,
  profile,
  register,
  updatePreferencias,
} from '../controllers/auth.controller.js';
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
  // Tope por IP: evita fuerza bruta rotando correos (cada uno reiniciaba el bucket).
  rateLimit({
    name: 'login-ip',
    max: LIMITS.loginIp.max,
    windowMs: LIMITS.loginIp.windowMs,
    failClosed: true,
  }),
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
router.patch('/preferencias', auth, updatePreferencias);

export default router;
