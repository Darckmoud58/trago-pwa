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

export type PushEnableResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/** Suscribe al PushManager y guarda en POST /api/push/subscribe (patrón Todo_pwa). */
export async function enableWebPush(): Promise<PushEnableResult> {
  if (!pushSupported()) {
    return {
      ok: false,
      message: 'Este navegador no soporta notificaciones push.',
    };
  }

  const { data: cfg } = await api.get<{
    configured?: boolean;
    publicKey?: string | null;
  }>('/api/push/subscribe');

  if (!cfg.configured || !cfg.publicKey) {
    const perm = await Notification.requestPermission();
    return {
      ok: false,
      message:
        perm === 'granted'
          ? 'Avisos listos en este dispositivo; el servidor aún no puede enviarlos.'
          : 'No se pudieron activar los avisos. Revisa el permiso de notificaciones.',
    };
  }

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return {
      ok: false,
      message: 'Sin permiso no hay aviso. Actívalo en el navegador.',
    };
  }

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
  });
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return {
      ok: false,
      message: 'El navegador no devolvió una suscripción válida.',
    };
  }

  await api.post('/api/push/subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });

  return {
    ok: true,
    message: 'Listo. Te avisamos el día de tu cumple aunque TraGo esté cerrado.',
  };
}
