import axios from 'axios';
import { api } from '../api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/** En iPhone/iPad el push solo existe con la PWA instalada (iOS 16.4+). */
export function needsIosInstall() {
  if (typeof navigator === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

/** navigator.serviceWorker.ready no se resuelve si no hay SW. */
async function swReady(ms = 8000) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((_, reject) => {
      window.setTimeout(
        () =>
          reject(
            new Error(
              'El service worker no está activo. Recarga la página.'
            )
          ),
        ms
      );
    }),
  ]);
}

export async function getSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function subscribePush() {
  const permission = await Notification.requestPermission();
  if (permission === 'denied') {
    throw new Error(
      'Bloqueaste las notificaciones. Actívalas en la configuración del sitio.'
    );
  }
  if (permission !== 'granted') {
    throw new Error('No se concedió el permiso de notificaciones');
  }

  const reg = await swReady();
  const { data } = await api.get<{ publicKey: string }>('/api/push/publicKey');
  if (!data.publicKey) {
    throw new Error('Las notificaciones no están configuradas en el servidor');
  }

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    }));

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error('El navegador no devolvió una suscripción válida.');
  }
  await api.post('/api/push/subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
  return sub;
}

export async function unsubscribePush() {
  const sub = await getSubscription();
  if (!sub) return;
  try {
    await api.post('/api/push/unsubscribe', { endpoint: sub.endpoint });
  } finally {
    await sub.unsubscribe();
  }
}

export async function sendTestPush() {
  await api.post('/api/push/test');
}

export function pushErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (typeof msg === 'string' && msg) return msg;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export type PushEnableResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/** Compatibilidad con Cuenta: suscribe y devuelve un resultado, sin lanzar. */
export async function enableWebPush(): Promise<PushEnableResult> {
  if (!pushSupported()) {
    return {
      ok: false,
      message: 'Este navegador no soporta notificaciones push.',
    };
  }
  try {
    await subscribePush();
    return {
      ok: true,
      message:
        'Listo. Te avisamos de promos vigentes y de tu cumpleaños aunque TraGo esté cerrado.',
    };
  } catch (error) {
    return {
      ok: false,
      message: pushErrorMessage(
        error,
        'No se pudieron activar los avisos. Revisa el permiso de notificaciones.'
      ),
    };
  }
}
