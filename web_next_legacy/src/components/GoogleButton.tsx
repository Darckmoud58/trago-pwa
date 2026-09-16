"use client";

import { useSearchParams } from "next/navigation";

export function GoogleButton({ label = "Continuar con Google" }: { label?: string }) {
  const next = useSearchParams().get("next") || "/promos";
  const href = `/api/auth/google?next=${encodeURIComponent(next)}`;

  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-2 border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-[#1a1008]"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.2 2.8-2.5 3.7v3h4c2.3-2.1 3.5-5.2 3.5-8.8z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 5.9-1 7.9-2.9l-4-3c-1.1.8-2.5 1.2-3.9 1.2-3 0-5.6-2-6.5-4.8H1.4v3.1C3.4 21.3 7.4 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.5 14.5c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.2H1.4C.5 9 0 10.5 0 12.4c0 1.9.5 3.4 1.4 5.2l4.1-3.1z"
        />
        <path
          fill="#EA4335"
          d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.8l4.1 3.1C6.4 6.8 9 4.8 12 4.8z"
        />
      </svg>
      {label}
    </a>
  );
}
