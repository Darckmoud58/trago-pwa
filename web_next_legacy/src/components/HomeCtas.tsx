"use client";

import Link from "next/link";
import { isNightInMexico } from "@/lib/night";
import { useSession } from "./SessionProvider";

export function HomeCtas() {
  const user = useSession();
  const night = isNightInMexico();

  return (
    <div className="rise-cta mt-8 flex flex-wrap gap-3">
      {!user && (
        <Link
          href="/registro"
          className="bg-[var(--copper)] px-6 py-3 text-sm font-semibold text-[#1a1008]"
        >
          Crear cuenta
        </Link>
      )}
      <Link
        href="/promos"
        className={`${user ? "bg-[var(--copper)] text-[#1a1008]" : "border border-white/30 text-[var(--foam)]"} px-6 py-3 text-sm font-semibold`}
      >
        Ver promociones
      </Link>
      {night && (
        <Link href="/nocturno" className="border border-white/30 px-6 py-3 text-sm text-[var(--foam)]">
          Noche
        </Link>
      )}
      <Link href="/cumple" className="border border-white/30 px-6 py-3 text-sm text-[var(--foam)]">
        Cumpleaños
      </Link>
      <a href="#instalar" className="border border-white/30 px-6 py-3 text-sm text-[var(--foam)]">
        Instalar app
      </a>
    </div>
  );
}
