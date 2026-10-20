import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { getMyReport, postReport } from '../controllers/reportes.controller.js';
import { LIMITS, rateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.get('/', auth, getMyReport);
router.post(
  '/',
  auth,
  rateLimit({
    name: 'vote',
    max: LIMITS.vote.max,
    windowMs: LIMITS.vote.windowMs,
    keyFn: (req, ip) => `rl:vote:${req.userId || ip}`,
  }),
  postReport
);

export default router;
