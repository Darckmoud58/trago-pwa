import { z } from 'zod';
import PushSubscription from '../models/PushSubscription.js';
import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';
import { publicVapidKey, vapidConfigured } from '../lib/push.js';
import { runBirthdayPushJob } from '../services/birthdayPushJob.js';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function getPushConfig(_req, res) {
  const configured = vapidConfigured() && Boolean(publicVapidKey());
  return res.json({
    configured,
    publicKey: configured ? publicVapidKey() : null,
  });
}

export async function subscribePush(req, res) {
  if (!vapidConfigured()) {
    return res.status(503).json({
      message: 'Push no configurado. Genera claves VAPID (npm run vapid).',
    });
  }

  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Suscripción inválida' });
  }

  try {
    await PushSubscription.findOneAndUpdate(
      { endpoint: parsed.data.endpoint },
      {
        $set: {
          userId: req.userId,
          keys: parsed.data.keys,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error('subscribePush:', e.message);
    return res.status(503).json({ message: 'No se guardó la suscripción' });
  }
}

async function authorizedBirthday(req) {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers['x-cron-secret'] === cron) return true;

  if (!req.userId) return false;
  const user = await Usuario.findById(req.userId).lean();
  if (!user || user.estatus !== 'activo') return false;
  const roleDoc = user.id_rol ? await Rol.findById(user.id_rol).lean() : null;
  return roleDoc?.codigo === 'admin';
}

export async function sendBirthdayPushes(req, res) {
  if (!(await authorizedBirthday(req))) {
    return res.status(403).json({ message: 'Sin permiso.' });
  }
  try {
    const result = await runBirthdayPushJob();
    return res.json(result);
  } catch (e) {
    const status = Number(e.status || e.statusCode) || 500;
    if (status >= 500) {
      console.error('sendBirthdayPushes:', e.message);
      return res.status(500).json({ message: 'Error del servidor' });
    }
    return res.status(status).json({ message: e.message || 'Error' });
  }
}
