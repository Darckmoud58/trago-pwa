import { Router } from 'express';
import {
  ageStatus,
  declareAge,
  declareBirthDate,
} from '../controllers/age.controller.js';
import { LIMITS, rateLimit } from '../middleware/rateLimit.js';

const router = Router();

const ageRl = rateLimit({
  name: 'age',
  max: LIMITS.age.max,
  windowMs: LIMITS.age.windowMs,
  failClosed: false,
});

/** M1: fecha de nacimiento → cookie (respuesta { ok: true }). */
router.post('/', ageRl, declareBirthDate);
router.post('/declare', ageRl, declareAge);
router.get('/status', ageStatus);

export default router;
