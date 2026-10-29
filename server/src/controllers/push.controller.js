import { z } from 'zod';
import PushSubscription from '../models/PushSubscription.js';
import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';
import { cronAuthorized } from '../lib/cronAuth.js';
import { publicVapidKey, sendPush, vapidConfigured } from '../lib/push.js';
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

/** Llave pública VAPID. Misma idea que GET /push/publicKey de Todo_pwa. */
export function publicKey(_req, res) {
  if (!vapidConfigured() || !publicVapidKey()) {
    return res.status(503).json({
      message: 'Las notificaciones no están configuradas en el servidor',
    });
  }
  return res.json({ publicKey: publicVapidKey() });
}

export async function unsubscribePush(req, res) {
  const endpoint = req.body?.endpoint;
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
    return res.status(400).json({ message: 'Falta endpoint' });
  }
  await PushSubscription.deleteOne({ endpoint, userId: req.userId });
  return res.json({ ok: true });
}

/** Aviso de prueba a los dispositivos de esta cuenta (promos, no tareas). */
export async function testPush(req, res) {
  if (!vapidConfigured()) {
    return res.status(503).json({
      message: 'Las notificaciones no están configuradas en el servidor',
    });
  }

  const subs = await PushSubscription.find({ userId: req.userId });
  if (!subs.length) {
    return res.status(404).json({
      message: 'No hay dispositivos suscritos para tu cuenta',
    });
  }

  let sent = 0;
  let failed = 0;
  let removed = 0;
  for (const sub of subs) {
    try {
      await sendPush(sub, {
        title: 'TraGo',
        body: 'Así se ven los avisos de promos vigentes cerca de ti.',
        url: '/cerca',
        tag: 'trago-test',
      });
      sent += 1;
    } catch (err) {
      const status = err?.statusCode;
      if (status === 404 || status === 410) {
        await PushSubscription.deleteOne({ endpoint: sub.endpoint });
        removed += 1;
      } else {
        failed += 1;
      }
    }
  }

  if (!sent && !failed) {
    return res.status(404).json({
      message: 'No hay dispositivos suscritos para tu cuenta',
    });
  }
  return res.json({ sent, failed, removed });
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
  if (cronAuthorized(req)) return true;

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
