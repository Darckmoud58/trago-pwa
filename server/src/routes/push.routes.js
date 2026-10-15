import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import {
  getPushConfig,
  sendBirthdayPushes,
  subscribePush,
} from '../controllers/push.controller.js';

const router = Router();

router.get('/subscribe', getPushConfig);
router.post('/subscribe', auth, subscribePush);
/** Cron (x-cron-secret) o admin JWT. Auth opcional para permitir solo cron. */
router.post('/birthday', async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return auth(req, res, (err) => {
      if (err) return next(err);
      return sendBirthdayPushes(req, res);
    });
  }
  return sendBirthdayPushes(req, res);
});

export default router;
