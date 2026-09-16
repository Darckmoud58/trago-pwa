"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { NearbyPromos } from "@/components/NearbyPromos";
import { DemoNotice } from "@/components/DemoNotice";
import { isNightInMexico } from "@/lib/night";

export default function NocturnoPage() {
  const router = useRouter();
  const night = isNightInMexico();

  useEffect(() => {
    if (!night) router.replace("/promos");
  }, [night, router]);

  if (!night) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-[var(--muted)]">
        Nocturno solo aparece de 19:00 a 06:00 (hora de Guadalajara).
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl text-[var(--foam)]">Nocturno</h1>
      <p className="mt-2 max-w-xl text-[var(--muted)]">
        Botellas, 2x1 y happy hour cerca de ti. Solo de noche, hora real de México.
      </p>
      <div className="mt-6">
        <DemoNotice />
      </div>
      <div className="mt-10">
        <NearbyPromos nocturno />
      </div>
    </div>
  );
}
