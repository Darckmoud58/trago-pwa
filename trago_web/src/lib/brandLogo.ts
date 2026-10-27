/** Logos locales (Wikimedia) para marcas oficiales — nítidos en PWA. */
const LOCAL_LOGOS: Record<string, string> = {
  oxxo: '/brands/oxxo.svg',
  '7 eleven': '/brands/7-eleven.svg',
  '7eleven': '/brands/7-eleven.svg',
  'seven eleven': '/brands/7-eleven.svg',
  chedraui: '/brands/chedraui.svg',
  'selecto chedraui': '/brands/chedraui.svg',
  walmart: '/brands/walmart.svg',
  mcdonalds: '/brands/mcdonalds.svg',
  'mc donalds': '/brands/mcdonalds.svg',
  'burger king': '/brands/burger-king.svg',
  burgerking: '/brands/burger-king.svg',
  'circle k': '/brands/circle-k.svg',
  circlek: '/brands/circle-k.svg',
  heb: '/brands/heb.svg',
  vips: '/brands/vips.svg',
  'krispy kreme': '/brands/krispy-kreme.svg',
  krispykreme: '/brands/krispy-kreme.svg',
};

/** Dominios oficiales → favicon de respaldo. */
const BRAND_DOMAINS: Record<string, string> = {
  oxxo: 'oxxo.com',
  '7-eleven': '7-eleven.com.mx',
  '7eleven': '7-eleven.com.mx',
  chedraui: 'chedraui.com.mx',
  'selecto chedraui': 'chedraui.com.mx',
  walmart: 'walmart.com.mx',
  "mcdonald's": 'mcdonalds.com.mx',
  mcdonalds: 'mcdonalds.com.mx',
  starbucks: 'starbucks.com.mx',
  'burger king': 'burgerking.com.mx',
  burgerking: 'burgerking.com.mx',
  'circle k': 'circlek.com.mx',
  circlek: 'circlek.com.mx',
  heb: 'heb.com.mx',
  'la europea': 'laeuropea.com.mx',
  "italianni's": 'italiannis.com.mx',
  italiannis: 'italiannis.com.mx',
  vips: 'vips.com.mx',
  'krispy kreme': 'krispykreme.mx',
  krispykreme: 'krispykreme.mx',
};

function fold(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function logoUrlFromSite(site?: string | null) {
  if (!site) return null;
  try {
    const host = new URL(site.includes('://') ? site : `https://${site}`)
      .hostname.replace(/^www\./, '');
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return null;
  }
}

function matchBrandKey(labels: string[], table: Record<string, string>) {
  for (const label of labels) {
    if (table[label]) return table[label];
    for (const [key, value] of Object.entries(table)) {
      if (label.includes(key) || key.includes(label)) return value;
    }
  }
  return null;
}

/** Logo de cadena conocida (local → API → sitio) o iniciales. */
export function resolveBrandLogo(input: {
  logoUrl?: string | null;
  officialBrand?: string | null;
  chainName?: string | null;
  nombre?: string | null;
  name?: string | null;
  website?: string | null;
}) {
  const labels = [input.officialBrand, input.chainName, input.nombre, input.name]
    .map((v) => fold(String(v || '')))
    .filter(Boolean);

  const local = matchBrandKey(labels, LOCAL_LOGOS);
  if (local) return local;

  // Solo aceptar logoUrl de API si ya es ruta local o data; no favicon 16px.
  if (input.logoUrl && input.logoUrl.startsWith('/brands/')) {
    return input.logoUrl;
  }

  const fromSite = logoUrlFromSite(input.website);
  if (fromSite) return fromSite;

  const domain = matchBrandKey(labels, BRAND_DOMAINS);
  if (domain) return logoUrlFromSite(domain);

  return null;
}
