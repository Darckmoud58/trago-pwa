import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { cronAuthorized } from '../lib/cronAuth.js';
import {
  getPushConfig,
  publicKey,
  sendBirthdayPushes,
  sendNewPromoPushes,
  subscribePush,
  testPush,
  unsubscribePush,
} from '../controllers/push.controller.js';

const router = Router();

function cronOrAdmin(handler) {
  return async (req, res, next) => {
    if (cronAuthorized(req)) {
      return handler(req, res);
    }
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      return auth(req, res, (err) => {
        if (err) return next(err);
        return handler(req, res);
      });
    }
    return handler(req, res);
  };
}

router.get('/publicKey', publicKey);
router.get('/subscribe', getPushConfig);
router.post('/subscribe', auth, subscribePush);
router.post('/unsubscribe', auth, unsubscribePush);
router.post('/test', auth, testPush);
/** Cron (x-cron-secret / Bearer CRON_SECRET) o admin JWT. */
router.post('/birthday', cronOrAdmin(sendBirthdayPushes));
router.post('/new-promos', cronOrAdmin(sendNewPromoPushes));

export default router;
