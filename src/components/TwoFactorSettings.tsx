"use client";

import { useEffect, useState } from "react";

export function TwoFactorSettings() {
  const [enabled, setEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/2fa/settings")
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.enabled)))
      .catch(() => {});
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/auth/2fa/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(typeof data.error === "string" ? data.error : "No se pudo cambiar.");
      return;
    }
    setEnabled(Boolean(data.enabled));
    setPassword("");
    setNote(data.enabled ? "2FA por correo activado." : "2FA desactivado.");
  }

  return (
    <section className="mt-10 border border-white/10 p-4">
      <h2 className="font-display text-2xl text-[var(--foam)]">Verificación en dos pasos</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Tras la contraseña, TraGo envía un código de 6 dígitos a tu correo. Requiere cuenta con
        password (no solo Google).
      </p>
      <p className="mt-3 text-sm text-[var(--gold)]">
        Estado: {enabled ? "activado" : "desactivado"}
      </p>
      <label className="mt-4 block text-sm text-[var(--muted)]">
        Confirma con tu contraseña
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full border border-white/15 bg-transparent px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !password}
          onClick={() => toggle(true)}
          className="bg-[var(--copper)] px-4 py-2 text-sm font-semibold text-[#1a1008] disabled:opacity-40"
        >
          Activar 2FA
        </button>
        <button
          type="button"
          disabled={busy || !password || !enabled}
          onClick={() => toggle(false)}
          className="border border-white/20 px-4 py-2 text-sm text-[var(--foam)] disabled:opacity-40"
        >
          Desactivar
        </button>
      </div>
      {note && <p className="mt-2 text-xs text-[var(--gold)]">{note}</p>}
    </section>
  );
}
