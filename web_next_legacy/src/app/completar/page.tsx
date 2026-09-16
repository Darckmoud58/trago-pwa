import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CompletarEdadForm } from "@/components/CompletarEdadForm";
import { PENDING_COOKIE, readPending } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export default async function CompletarPage() {
  const pending = await readPending((await cookies()).get(PENDING_COOKIE)?.value ?? "");
  if (!pending) redirect("/registro");

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-4xl text-[var(--foam)]">Último paso</h1>
      <p className="mt-2 text-[var(--muted)]">
        TraGo pide tu fecha: perfil joven (13–17) sin alcohol, o adulto (18+) con catálogo completo.
      </p>
      <div className="mt-8">
        <Suspense>
          <CompletarEdadForm name={pending.name} />
        </Suspense>
      </div>
    </div>
  );
}
