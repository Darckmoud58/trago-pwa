"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleButton } from "./GoogleButton";

const GOOGLE_ERRORS: Record<string, string> = {
  "google-config":
    "Falta configurar Google (GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET). El correo sigue funcionando.",
  "google-state": "La sesión de Google expiró. Intenta de nuevo.",
  "google-fail": "Google no pudo completar el acceso.",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/promos";
  const [error, setError] = useState<string | null>(() => {
    const raw = params.get("error");
    if (!raw) return null;
    return GOOGLE_ERRORS[raw] ?? raw;
  });
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "No se pudo entrar");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
      <GoogleButton label="Entrar con Google" />
      <p className="text-center text-xs uppercase tracking-[0.2em] text-[var(--muted)]">o con correo</p>
      <label className="block text-sm text-[var(--muted)]">
        Correo
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <label className="block text-sm text-[var(--muted)]">
        Contraseña
        <input
          name="password"
          type="password"
          required
          className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)]"
        />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {params.get("error") === "google-config" && (
        <ol className="list-decimal space-y-1 pl-5 text-xs text-[var(--muted)]">
          <li>
            Abre{" "}
            <a
              className="text-[var(--gold)]"
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
            >
              Google Cloud → Credenciales
            </a>
          </li>
          <li>Crear credenciales → ID de cliente de OAuth → Aplicación web.</li>
          <li>
            Origen: <code className="text-[var(--foam)]">http://localhost:3000</code>
          </li>
          <li>
            Redirect:{" "}
            <code className="text-[var(--foam)]">
              http://localhost:3000/api/auth/google/callback
            </code>
          </li>
          <li>
            Pega Client ID y Secret en <code className="text-[var(--foam)]">GK/trago/.env</code> y
            corre <code className="text-[var(--foam)]">docker compose up -d</code>.
          </li>
        </ol>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[var(--copper)] px-4 py-3 text-sm font-semibold text-[#1a1008] disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
