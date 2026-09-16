"use client";

import { useState } from "react";

export function BirthdayPushSend() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/push/birthday", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(typeof data.error === "string" ? data.error : "No se pudo enviar.");
      return;
    }
    setNote(
      `Cumpleaños hoy: ${data.users ?? 0} · suscripciones ${data.subscriptions ?? 0} · enviados ${data.sent ?? 0} · fallidos ${data.failed ?? 0}`,
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={busy}
        onClick={send}
        className="border border-white/20 px-4 py-2 text-sm text-[var(--foam)] disabled:opacity-60"
      >
        {busy ? "Enviando…" : "Enviar push a cumpleaños de hoy"}
      </button>
      {note && <p className="mt-2 text-xs text-[var(--gold)]">{note}</p>}
    </div>
  );
}
