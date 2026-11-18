import OfficialRefresh from '../models/OfficialRefresh.js';
import Promocion from '../models/Promocion.js';
import PushSubscription from '../models/PushSubscription.js';
import Usuario from '../models/Usuario.js';
import { MIN_ALCOHOL_AGE, resolveUserAge } from '../lib/ageGate.js';
import { sendPush, vapidConfigured } from '../lib/push.js';

const LOOKBACK_MS = 6.5 * 60 * 60 * 1000;

function discountRatio(p) {
  const list = Number(p.precio_lista);
  const sale = Number(p.precio);
  if (!(list > 0) || !(sale >= 0) || sale >= list) return 0;
  return (list - sale) / list;
}

function isBigOffer(p) {
  return Boolean(p.destacada) || discountRatio(p) >= 0.25;
}

function shortTitle(nombre) {
  const t = String(nombre || '').trim();
  if (t.length <= 48) return t;
  return `${t.slice(0, 45).trim()}…`;
}

/**
 * Avisa a dispositivos suscritos cuando hay promos oficiales nuevas
 * o ofertas fuertes desde el último push (tras el job de scrapers).
 * No inventa ofertas: solo lee Mongo con origen: oficial.
 */
export async function runNewPromosPushJob() {
  if (!vapidConfigured()) {
    const err = new Error('VAPID no configurado.');
    err.status = 503;
    throw err;
  }

  const status = await OfficialRefresh.findOne({ key: 'global' }).lean();
  // Primera vez: solo marca baseline (evita flood con todo el catálogo).
  if (!status?.lastNewPromoPushAt) {
    await OfficialRefresh.findOneAndUpdate(
      { key: 'global' },
      {
        $set: { lastNewPromoPushAt: new Date() },
        $setOnInsert: { key: 'global' },
      },
      { upsert: true }
    );
    return {
      ok: true,
      sent: 0,
      failed: 0,
      removed: 0,
      newPromos: 0,
      subscriptions: 0,
      reason: 'baseline',
    };
  }

  const since = new Date(status.lastNewPromoPushAt);
  // Seguridad: no mirar más atrás que el ciclo del scraper.
  if (Date.now() - since.getTime() > LOOKBACK_MS * 2) {
    since.setTime(Date.now() - LOOKBACK_MS);
  }

  const fresh = await Promocion.find({
    origen: 'oficial',
    estatus: 'activo',
    createdAt: { $gt: since },
  })
    .sort({ destacada: -1, createdAt: -1 })
    .limit(20)
    .select('nombre alcohol destacada precio precio_lista createdAt updatedAt')
    .lean();

  const bumped = await Promocion.find({
    origen: 'oficial',
    estatus: 'activo',
    destacada: true,
    updatedAt: { $gt: since },
    createdAt: { $lte: since },
  })
    .sort({ updatedAt: -1 })
    .limit(10)
    .select('nombre alcohol destacada precio precio_lista createdAt updatedAt')
    .lean();

  const byId = new Map();
  for (const p of [...fresh, ...bumped]) {
    byId.set(String(p._id), p);
  }
  const promos = [...byId.values()].sort((a, b) => {
    const big = Number(isBigOffer(b)) - Number(isBigOffer(a));
    if (big) return big;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (!promos.length) {
    return {
      ok: true,
      sent: 0,
      failed: 0,
      removed: 0,
      newPromos: 0,
      subscriptions: 0,
      reason: 'none',
    };
  }

  const bigOnes = promos.filter(isBigOffer);
  const sample = (bigOnes.length ? bigOnes : promos).slice(0, 3);
  const titles = sample.map((p) => shortTitle(p.nombre));
  const count = promos.length;
  const hasBig = bigOnes.length > 0;

  const title = hasBig
    ? 'TraGo · oferta fuerte cerca'
    : count === 1
      ? 'TraGo · promo nueva'
      : `TraGo · ${count} promos nuevas`;

  const body =
    titles.length === 1
      ? `${titles[0]}. Abre Cerca y no te muevas de balde.`
      : `${titles.join(' · ')}. Mira cuáles siguen vivas.`;

  const needsAdult = sample.some((p) => p.alcohol);
  const subs = await PushSubscription.find({}).lean();
  if (!subs.length) {
    await OfficialRefresh.findOneAndUpdate(
      { key: 'global' },
      { $set: { lastNewPromoPushAt: new Date() }, $setOnInsert: { key: 'global' } },
      { upsert: true }
    );
    return {
      ok: true,
      sent: 0,
      failed: 0,
      removed: 0,
      newPromos: count,
      subscriptions: 0,
      reason: 'no-subscribers',
    };
  }

  const userIds = [...new Set(subs.map((s) => String(s.userId)).filter(Boolean))];
  const users = await Usuario.find({ _id: { $in: userIds } })
    .select('_id fecha_nacimiento edad estatus')
    .lean();
  const ageById = new Map(
    users.map((u) => [String(u._id), resolveUserAge(u)])
  );

  let sent = 0;
  let failed = 0;
  let removed = 0;
  let skippedTeen = 0;

  for (const sub of subs) {
    const age = ageById.get(String(sub.userId));
    if (needsAdult && (age == null || age < MIN_ALCOHOL_AGE)) {
      skippedTeen += 1;
      continue;
    }
    try {
      await sendPush(sub, {
        title,
        body,
        url: '/cerca',
        tag: 'trago-new-promos',
      });
      sent += 1;
    } catch (err) {
      const statusCode = err?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await PushSubscription.deleteOne({ endpoint: sub.endpoint });
        removed += 1;
      } else {
        failed += 1;
      }
    }
  }

  await OfficialRefresh.findOneAndUpdate(
    { key: 'global' },
    { $set: { lastNewPromoPushAt: new Date() }, $setOnInsert: { key: 'global' } },
    { upsert: true }
  );

  return {
    ok: true,
    sent,
    failed,
    removed,
    skippedTeen,
    newPromos: count,
    bigOffers: bigOnes.length,
    subscriptions: subs.length,
    sample: titles,
  };
}
