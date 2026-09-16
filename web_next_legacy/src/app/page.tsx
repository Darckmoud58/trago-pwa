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
            Promos que sí se cumplen. Cerca de ti.
          </h1>
          <p className="rise-delay mt-3 max-w-md text-[var(--muted)]">
            Oficiales, publicadas por la cadena y validadas en piso. Opina, gana puntos, canjea
            cupones.
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
        <h2 className="font-display text-3xl text-[var(--foam)]">Tres motores, una verdad</h2>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          El profesor pidió involucrar al usuario y a la empresa. TraGo premia la opinión en
          sucursal y da a la cadena un canal para publicar — sin dejar de leer su web oficial.
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Oficial</p>
            <p className="mt-2 font-display text-2xl text-[var(--foam)]">Página de la cadena</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Sync de promociones públicas (OXXO, La Europea…). Fuente verificable.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Empresa</p>
            <p className="mt-2 font-display text-2xl text-[var(--foam)]">Se registra y publica</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Alta en TraGo, panel propio y ofertas con fechas. La reputación mide si cumplen.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Usuario</p>
            <p className="mt-2 font-display text-2xl text-[var(--foam)]">Opina y gana</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Vigencia con GPS, experiencia en local, puntos y cupones. Incentivo a la calle y
              a la caja.
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
