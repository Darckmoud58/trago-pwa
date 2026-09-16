"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function BirthdayPushButton() {
  const [supported, setSupported] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window,
    );
  }, []);

  if (!supported) return null;

  async function enable() {
    setBusy(true);
    setNote(null);
    try {
      const cfg = await fetch("/api/push/subscribe").then((r) => r.json());
      if (!cfg.configured || !cfg.publicKey) {
        const perm = await Notification.requestPermission();
        setNote(
          perm === "granted"
            ? "Push VAPID no está en el servidor. Permiso local listo: el aviso llega si TraGo está abierto el día de tu cumple."
            : "Push VAPID no configurado y sin permiso de notificaciones.",
        );
        setBusy(false);
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setNote("Sin permiso no hay aviso. Actívalo en el navegador.");
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setNote("El navegador no devolvió una suscripción válida.");
        setBusy(false);
        return;
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(typeof data.error === "string" ? data.error : "No se guardó la suscripción.");
        setBusy(false);
        return;
      }
      setNote("Listo. Te avisamos el día de tu cumple aunque TraGo esté cerrado.");
    } catch {
      setNote("No se pudo activar el push. Prueba en Chrome/Edge con HTTPS o localhost.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={busy}
        onClick={enable}
        className="border border-white/20 px-4 py-2 text-sm text-[var(--foam)] disabled:opacity-60"
      >
        {busy ? "Activando…" : "Avisarme el día de mi cumple"}
      </button>
      {note && <p className="mt-2 text-xs text-[var(--gold)]">{note}</p>}
    </div>
  );
}
