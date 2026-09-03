import { DemoNotice } from "@/components/DemoNotice";
import { NearbyPromos } from "@/components/NearbyPromos";
import { AdBanner } from "@/components/AdBanner";
import { HomeCtas } from "@/components/HomeCtas";

export default function HomePage() {
  return (
    <div>
      <section className="relative min-h-[100svh] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1800&h=1200&fit=crop"
          alt=""
          className="hero-media absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08110e] via-[#08110e]/55 to-[#08110e]/25" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28">
          <p className="rise font-display text-6xl leading-none text-[var(--foam)] sm:text-8xl">
            TraGo
          </p>
          <h1 className="rise-delay mt-5 max-w-xl text-2xl font-medium text-[var(--foam)] sm:text-3xl">
            Promos vigentes en Guadalajara. En la sucursal de a lado.
          </h1>
          <p className="rise-delay mt-3 max-w-md text-[var(--muted)]">
            Comida, café, botellas y regalos de cumpleaños. GPS para no ir de balde.
          </p>
          <HomeCtas />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <DemoNotice />
        <div className="mt-8">
          <NearbyPromos />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="font-display text-3xl text-[var(--foam)]">Quién mueve la vigencia</h2>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Lalo dejó abierto si las empresas cargan las promos o si los usuarios las
          actualizan. TraGo hace las dos: la cadena publica y marca sucursales; la gente en
          piso dice si todavía está viva.
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Cadena</p>
            <p className="mt-2 font-display text-2xl text-[var(--foam)]">Publica la promo</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Fechas, sucursales participantes y términos. Perfil Pro destaca; Premium abre
              API.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Usuario</p>
            <p className="mt-2 font-display text-2xl text-[var(--foam)]">Confirma en sucursal</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              “Sigue vigente” o “ya no aplica”. Si se acumulan reportes en contra, la promo
              pasa a duda o se oculta en esa sucursal.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <AdBanner />
      </section>
    </div>
  );
}
