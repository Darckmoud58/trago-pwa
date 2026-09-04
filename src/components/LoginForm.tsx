"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  const [step2fa, setStep2fa] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

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
    if (data.needs2fa) {
      setStep2fa(true);
      setDevCode(typeof data.devCode === "string" ? data.devCode : null);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function onVerify2fa(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: otp }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Código incorrecto");
      return;
    }
    router.push(next);
    router.refresh();
  }

  if (step2fa) {
    return (
      <form onSubmit={onVerify2fa} className="mx-auto max-w-md space-y-4">
        <p className="text-sm text-[var(--muted)]">
          Segundo paso: te enviamos un código de 6 dígitos al correo.
        </p>
        {devCode && (
          <p className="border border-[var(--copper)]/40 px-3 py-2 text-xs text-[var(--gold)]">
            Modo dev (sin Resend): código <span className="font-mono">{devCode}</span>
          </p>
        )}
        <label className="block text-sm text-[var(--muted)]">
          Código
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            pattern="\d{6}"
            required
            autoComplete="one-time-code"
            className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 font-mono text-lg tracking-[0.3em] text-[var(--foam)]"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending || otp.length !== 6}
          className="w-full bg-[var(--copper)] px-4 py-3 text-sm font-semibold text-[#1a1008] disabled:opacity-60"
        >
          {pending ? "Verificando…" : "Confirmar e entrar"}
        </button>
        <button
          type="button"
          className="w-full text-sm text-[var(--muted)]"
          onClick={() => {
            setStep2fa(false);
            setOtp("");
            setDevCode(null);
          }}
        >
          Volver
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
      <GoogleButton label="Entrar con Google" />
      <p className="text-center text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
        o con correo
      </p>
      <label className="block text-sm text-[var(--muted)]">
        Correo
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <label className="block text-sm text-[var(--muted)]">
        Contraseña
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)]"
        />
      </label>
      <p className="text-right text-sm">
        <Link href="/recuperar" className="text-[var(--gold)]">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}
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
