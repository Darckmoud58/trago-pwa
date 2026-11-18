import webpush from 'web-push';

export function vapidConfigured(raw = process.env) {
  return Boolean(
    raw.VAPID_PUBLIC_KEY && raw.VAPID_PRIVATE_KEY && raw.VAPID_SUBJECT
  );
}

/** Decodifica base64url → Buffer. */
export function decodeVapidKey(base64String) {
  const cleaned = String(base64String || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  if (!cleaned) return Buffer.alloc(0);
  const padding = '='.repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

/**
 * VAPID pública válida para PushManager: 65 bytes (0x04 || X || Y).
 * Algunas claves viejas vienen en 64 bytes (sin prefijo); se normalizan.
 */
export function normalizeVapidPublicKey(rawKey) {
  const cleaned = String(rawKey || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  if (!cleaned) return '';
  let buf = decodeVapidKey(cleaned);
  if (buf.length === 64) {
    buf = Buffer.concat([Buffer.from([0x04]), buf]);
  }
  if (buf.length !== 65 || buf[0] !== 0x04) {
    return '';
  }
  return buf.toString('base64url');
}

export function publicVapidKey(raw = process.env) {
  // Preferir la del API (par con VAPID_PRIVATE_KEY). VITE solo fallback.
  const candidate =
    raw.VAPID_PUBLIC_KEY || raw.VITE_VAPID_PUBLIC_KEY || '';
  return normalizeVapidPublicKey(candidate);
}

function ensureVapid(raw = process.env) {
  const publicKey = normalizeVapidPublicKey(
    raw.VAPID_PUBLIC_KEY || raw.VITE_VAPID_PUBLIC_KEY
  );
  const privateKey = String(raw.VAPID_PRIVATE_KEY || '').trim();
  const subject = raw.VAPID_SUBJECT || 'mailto:trago@localhost';
  if (!publicKey || !privateKey) {
    throw new Error(
      'VAPID inválido: regenera con npm run vapid (pública debe ser 65 bytes).'
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

/**
 * @param {{ endpoint: string, keys: { p256dh: string, auth: string } }} sub
 * @param {{ title: string, body: string, url?: string, tag?: string }} payload
 */
export async function sendPush(sub, payload) {
  ensureVapid();
  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: sub.keys,
    },
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? '/cerca',
      tag: payload.tag ?? 'trago-push',
    })
  );
}
