#!/usr/bin/env node
/**
 * Envía un Web Push con el formato REAL de digests (no el copy viejo de prueba).
 * Uso: cd server && node scripts/send-promo-push.mjs
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import PushSubscription from '../src/models/PushSubscription.js';
import Promocion from '../src/models/Promocion.js';
import { sendPush, publicVapidKey, vapidConfigured } from '../src/lib/push.js';

if (!vapidConfigured() || !publicVapidKey()) {
  console.error('VAPID inválido en .env');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB || 'trago',
});

const promos = await Promocion.find({ origen: 'oficial', estatus: 'activo' })
  .sort({ destacada: -1, updatedAt: -1 })
  .limit(3)
  .select('nombre destacada')
  .lean();

const titles = promos.map((p) => {
  const t = String(p.nombre || '').trim();
  return t.length <= 48 ? t : `${t.slice(0, 45)}…`;
});

const title = promos.some((p) => p.destacada)
  ? 'TraGo · oferta fuerte cerca'
  : 'TraGo · promos nuevas';
const body =
  titles.length === 0
    ? 'Hay promos oficiales cerca. Abre Cerca y no te muevas de balde.'
    : titles.length === 1
      ? `${titles[0]}. Abre Cerca y no te muevas de balde.`
      : `${titles.join(' · ')}. Mira cuáles siguen vivas.`;

const subs = await PushSubscription.find({}).lean();
console.log({ title, body, titles, subscriptions: subs.length });

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
      console.error('fail', status || err.message);
    }
  }
}

console.log({ sent, failed, removed });
await mongoose.disconnect();
