"use client";

import { NearbyPromos } from "@/components/NearbyPromos";
import { DemoNotice } from "@/components/DemoNotice";
import { BirthdayPushButton } from "@/components/BirthdayPushButton";
import { useSession } from "@/components/SessionProvider";
import { isBirthdayToday } from "@/lib/night";
import Link from "next/link";

export default function CumplePage() {
  const user = useSession();
  const today = user?.birthDate ? isBirthdayToday(user.birthDate) : false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl text-[var(--foam)]">Cumpleaños</h1>
      <p className="mt-2 max-w-xl text-[var(--muted)]">
        Lugares en Guadalajara que el día de tu cumple te regalan postre, café, shot o un
        combo. Confirmamos con la fecha de tu cuenta.
      </p>
      <div className="mt-6">
        <DemoNotice />
      </div>
      {!user && (
        <p className="mt-6 text-sm text-[var(--gold)]">
          <Link href="/registro?next=/cumple">Regístrate</Link> con tu fecha de nacimiento
          para el aviso del día.
        </p>
      )}
      {user && !today && (
        <p className="mt-6 text-sm text-[var(--muted)]">
          Hoy no es tu cumpleaños. Igual puedes ver qué suelen regalar.
        </p>
      )}
      {user && <BirthdayPushButton />}
      {today && (
        <p className="mt-6 font-display text-2xl text-[var(--gold)]">
          Feliz cumpleaños, {user?.name}. Esto te regalan cerca.
        </p>
      )}
      <div className="mt-10">
        <NearbyPromos birthday />
      </div>
    </div>
  );
}
