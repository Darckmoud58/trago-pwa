export function AdBanner() {
  return (
    <aside className="border border-dashed border-white/20 bg-[#0e1a16] px-5 py-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]">Anuncio · Freemium</p>
      <p className="mt-2 font-display text-xl text-[var(--foam)]">Tu cadena aquí</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Plan Pro quita anuncios y destaca la promo en Cerca.
      </p>
    </aside>
  );
}
