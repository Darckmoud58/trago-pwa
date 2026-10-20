/**
 * Evita mandar al home genérico de la cadena cuando hay una sección de ofertas / cupones.
 */
export function resolveOfficialPromoUrl(url?: string | null): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    // Solo http(s): evita javascript:/data: en <a href>.
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '') || '/';
    const isHome = path === '/' || path === '';

    const deepLinks: Record<string, string> = {
      'burgerking.com.mx': 'https://www.burgerking.com.mx/cuponeras',
      'mcdonalds.com.mx': 'https://www.mcdonalds.com.mx/promociones',
      'starbucks.com.mx': 'https://www.starbucks.com.mx/',
      'vips.com.mx': 'https://www.vips.com.mx/menu',
      'walmart.com.mx': 'https://www.walmart.com.mx/content/ofertas',
      'kfc.com.mx': 'https://kfc.com.mx/',
      'carlsjr.com.mx': 'https://carlsjr.com.mx/',
      'costco.com.mx': 'https://www.costco.com.mx/',
      'benavides.com.mx': 'https://www.benavides.com.mx/promociones',
      'farmaciasguadalajara.com': 'https://www.farmaciasguadalajara.com/ofertas',
      'popeyes.com.mx': 'https://popeyes.com.mx/menu/',
      'liverpool.com.mx': 'https://www.liverpool.com.mx/tienda/promociones',
      'mexico.littlecaesars.com': 'https://mexico.littlecaesars.com/es-mx/',
      'oxxo.com': 'https://www.oxxo.com/promociones',
      'heb.com.mx': 'https://www.heb.com.mx/promociones',
      'circlek.com.mx': 'https://circlek.com.mx/promociones/',
      '7-eleven.com.mx': 'https://7-eleven.com.mx/ofertas/',
      'chedraui.com.mx': 'https://www.chedraui.com.mx/',
      'laeuropea.com.mx': 'https://laeuropea.com.mx/collections/promociones',
      'krispykreme.mx': 'https://www.krispykreme.mx/promociones/',
    };

    if (isHome && deepLinks[host]) return deepLinks[host];
    return u.toString();
  } catch {
    return '';
  }
}
