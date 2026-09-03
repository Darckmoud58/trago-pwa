"use client";

import Link from "next/link";
import { useSession } from "./SessionProvider";
import { isBirthdayToday, isNightInMexico } from "@/lib/night";

export function NavBar() {
  const user = useSession();
  const night = isNightInMexico();
  const birthday = user?.birthDate ? isBirthdayToday(user.birthDate) : false;

  const links = [
    { href: "/", label: "Cerca" },
    { href: "/promos", label: "Promos" },
    ...(night ? [{ href: "/nocturno", label: "Noche" }] : []),
    { href: "/cumple", label: birthday ? "Hoy cumple" : "Cumple" },
    { href: "/cadenas", label: "Cadenas" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#08110e]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="group flex items-baseline gap-2">
            <span className="font-display text-3xl tracking-tight text-[var(--foam)]">
              Tra<span className="text-[var(--copper)]">G</span>o
            </span>
            <span className="hidden text-xs uppercase tracking-[0.22em] text-[var(--muted)] sm:inline">
              Guadalajara · promos vigentes
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--foam)]"
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <Link href="/cuenta" className="px-3 py-2 text-sm text-[var(--gold)]">
                {user.name}
              </Link>
            ) : (
              <Link href="/registro" className="px-3 py-2 text-sm text-[var(--gold)]">
                Registro
              </Link>
            )}
          </nav>
        </div>
      </header>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 grid border-t border-white/10 bg-[#08110e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="py-3 text-center text-[11px] uppercase tracking-wider text-[var(--muted)]"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
