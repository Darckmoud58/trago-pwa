import { z } from 'zod';
import PushSubscription from '../models/PushSubscription.js';
import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';
import { cronAuthorized } from '../lib/cronAuth.js';
import { publicVapidKey, sendPush, vapidConfigured } from '../lib/push.js';
import { runBirthdayPushJob } from '../services/birthdayPushJob.js';
import { runNewPromosPushJob } from '../services/newPromosPushJob.js';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function getPushConfig(_req, res) {
  const key = publicVapidKey();
  const configured = vapidConfigured() && Boolean(key);
  return res.json({
    configured,
    publicKey: configured ? key : null,
  });
}

/** Llave pública VAPID. Misma idea que GET /push/publicKey de Todo_pwa. */
export function publicKey(_req, res) {
  const key = publicVapidKey();
  if (!vapidConfigured() || !key) {
    return res.status(503).json({
      message:
        'Las notificaciones no están configuradas: VAPID inválido o incompleto. En server corre npm run vapid y reinicia.',
    });
  }
  return res.json({ publicKey: key });
}

export async function unsubscribePush(req, res) {
  const endpoint = req.body?.endpoint;
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
    return res.status(400).json({ message: 'Falta endpoint' });
  }
  await PushSubscription.deleteOne({ endpoint, userId: req.userId });
  return res.json({ ok: true });
}

/** Aviso a los dispositivos de esta cuenta — formato real de digests de promos. */
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

  // Mismo copy que el job de promos nuevas (origen oficial, sin inventar).
  let Promocion;
  try {
    Promocion = (await import('../models/Promocion.js')).default;
  } catch {
    Promocion = null;
  }
  let title = 'TraGo · promos nuevas';
  let body = 'Hay promos oficiales cerca. Abre Cerca y no te muevas de balde.';
  if (Promocion) {
    const promos = await Promocion.find({ origen: 'oficial', estatus: 'activo' })
      .sort({ destacada: -1, updatedAt: -1 })
      .limit(3)
      .select('nombre destacada')
      .lean();
    const titles = promos.map((p) => {
      const t = String(p.nombre || '').trim();
      return t.length <= 48 ? t : `${t.slice(0, 45)}…`;
    });
    if (promos.some((p) => p.destacada)) title = 'TraGo · oferta fuerte cerca';
    if (titles.length === 1) {
      body = `${titles[0]}. Abre Cerca y no te muevas de balde.`;
    } else if (titles.length > 1) {
      body = `${titles.join(' · ')}. Mira cuáles siguen vivas.`;
    }
  }

  let sent = 0;
  let failed = 0;
  let removed = 0;
  for (const sub of subs) {
    try {
      await sendPush(sub, {
        title,
        body,
        url: '/cerca',
        tag: 'trago-new-promos',
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
  return res.json({ sent, failed, removed, title, body });
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

/** Cron o admin: digiere promos oficiales nuevas / destacadas. */
export async function sendNewPromoPushes(req, res) {
  if (!(await authorizedBirthday(req))) {
    return res.status(403).json({ message: 'Sin permiso.' });
  }
  try {
    const result = await runNewPromosPushJob();
    return res.json(result);
  } catch (e) {
    const status = Number(e.status || e.statusCode) || 500;
    if (status >= 500) {
      console.error('sendNewPromoPushes:', e.message);
      return res.status(500).json({ message: 'Error del servidor' });
    }
    return res.status(status).json({ message: e.message || 'Error' });
  }
}
