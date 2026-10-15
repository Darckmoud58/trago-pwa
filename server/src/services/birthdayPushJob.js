import PushSubscription from '../models/PushSubscription.js';
import Usuario from '../models/Usuario.js';
import { birthDateIso, isBirthdayToday } from '../lib/birthday.js';
import { sendPush, vapidConfigured } from '../lib/push.js';
import { MIN_ALCOHOL_AGE, resolveUserAge } from '../lib/ageGate.js';

/**
 * Envía Web Push a usuarios 18+ con cumpleaños hoy (America/Mexico_City).
 * @returns {Promise<{ ok: true, users: number, subscriptions: number, sent: number, failed: number }>}
 */
export async function runBirthdayPushJob() {
  if (!vapidConfigured()) {
    const err = new Error('VAPID no configurado.');
    err.status = 503;
    throw err;
  }

  const users = await Usuario.find({
    estatus: 'activo',
    fecha_nacimiento: { $ne: null },
  })
    .select('_id nombre ape_paterno fecha_nacimiento edad')
    .lean();

  const birthdayUsers = users.filter((u) => {
    const age = resolveUserAge(u);
    if (age == null || age < MIN_ALCOHOL_AGE) return false;
    const iso = birthDateIso(u.fecha_nacimiento);
    return isBirthdayToday(iso);
  });

  if (birthdayUsers.length === 0) {
    return { ok: true, sent: 0, users: 0, subscriptions: 0, failed: 0 };
  }

  const byId = new Map(birthdayUsers.map((u) => [String(u._id), u]));
  const subs = await PushSubscription.find({
    userId: { $in: birthdayUsers.map((u) => u._id) },
  }).lean();

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const user = byId.get(String(sub.userId));
    if (!user) continue;
    const name =
      [user.nombre, user.ape_paterno].filter(Boolean).join(' ') || 'TraGo';
    try {
      await sendPush(sub, {
        title: 'Feliz cumpleaños — TraGo',
        body: `${name}, hoy te regalan algo cerca. Abre Cerca.`,
        url: '/cerca',
        tag: 'trago-birthday',
      });
      sent += 1;
    } catch (err) {
      failed += 1;
      const status = err?.statusCode;
      if (status === 404 || status === 410) {
        await PushSubscription.deleteOne({ endpoint: sub.endpoint });
      }
    }
  }

  return {
    ok: true,
    users: birthdayUsers.length,
    subscriptions: subs.length,
    sent,
    failed,
  };
}
