import webpush from 'web-push';

export function vapidConfigured(raw = process.env) {
  return Boolean(
    raw.VAPID_PUBLIC_KEY && raw.VAPID_PRIVATE_KEY && raw.VAPID_SUBJECT
  );
}

export function publicVapidKey(raw = process.env) {
  return (
    raw.VITE_VAPID_PUBLIC_KEY ||
    raw.VAPID_PUBLIC_KEY ||
    ''
  );
}

function ensureVapid(raw = process.env) {
  const publicKey = raw.VAPID_PUBLIC_KEY || raw.VITE_VAPID_PUBLIC_KEY;
  const privateKey = raw.VAPID_PRIVATE_KEY;
  const subject = raw.VAPID_SUBJECT || 'mailto:trago@localhost';
  if (!publicKey || !privateKey) {
    throw new Error('Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY');
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
