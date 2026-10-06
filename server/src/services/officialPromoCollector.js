import crypto from 'node:crypto';
import Promocion from '../models/Promocion.js';
import Empresa from '../models/Empresa.js';

const UA = 'Mozilla/5.0 (compatible; TraGoPromoCollector/1.0; +https://trago.app)';

/**
 * Cadenas con sitio oficial parseable + alias para emparejar nombres OSM.
 * Si OSM muestra la tienda pero no está aquí, no habrá promos (solo el pin).
 */
export const OFFICIAL_BRANDS = {
  oxxo: {
    nombre: 'OXXO',
    aliases: ['oxxo'],
    sitio_web: 'https://www.oxxo.com',
    urls: [
      'https://www.oxxo.com/promociones',
      'https://www.oxxo.com/promociones/bebidas',
      'https://www.oxxo.com/promociones/cerveza-vinos-y-licores',
    ],
  },
  'la-europea': {
    nombre: 'La Europea',
    aliases: ['la europea', 'laeuropea'],
    sitio_web: 'https://www.laeuropea.com.mx',
    urls: ['https://www.laeuropea.com.mx/promociones.html'],
  },
  'circle-k': {
    nombre: 'Circle K',
    aliases: ['circle k', 'circlek', 'circle-k'],
    sitio_web: 'https://circlek.com.mx',
    urls: ['https://circlek.com.mx/promociones/'],
  },
  heb: {
    nombre: 'HEB',
    aliases: ['heb', 'h-e-b', 'heb mexico'],
    sitio_web: 'https://www.heb.com.mx',
    urls: ['https://www.heb.com.mx/promociones'],
  },
  chedraui: {
    nombre: 'Chedraui',
    aliases: ['chedraui', 'selecto chedraui', 'super chedraui'],
    sitio_web: 'https://www.chedraui.com.mx',
    urls: [
      'https://www.chedraui.com.mx/api/catalog_system/pub/products/search?O=OrderByBestDiscountDESC&_from=0&_to=29',
    ],
  },
  '7-eleven': {
    nombre: '7-Eleven',
    aliases: ['7-eleven', '7 eleven', '7eleven', 'seven eleven', '7-eleven mexico'],
    sitio_web: 'https://7-eleven.com.mx',
    // Sin www: el certificado de www.7-eleven.com.mx no es válido
    urls: ['https://7-eleven.com.mx/ofertas/'],
  },
  'burger-king': {
    nombre: 'Burger King',
    aliases: ['burger king', 'burgerking', 'burguer king', 'burguerking', 'bk'],
    sitio_web: 'https://www.burgerking.com.mx',
    urls: ['special:burger-king-loyalty'],
  },
  mcdonalds: {
    nombre: "McDonald's",
    aliases: ['mcdonalds', "mcdonald's", 'mc donalds', 'mc donald', 'mcdonald'],
    sitio_web: 'https://www.mcdonalds.com.mx',
    // Cloudflare bloquea fetch directo; el colector usa un lector HTTP
    urls: ['special:mcdonalds-reader'],
  },
  starbucks: {
    nombre: 'Starbucks',
    aliases: ['starbucks'],
    sitio_web: 'https://www.starbucks.com.mx',
    urls: ['special:starbucks-next'],
  },
  'krispy-kreme': {
    nombre: 'Krispy Kreme',
    aliases: ['krispy kreme', 'krispykreme', 'krispy'],
    sitio_web: 'https://www.krispykreme.mx',
    urls: [
      'https://www.krispykreme.mx/wp-json/wp/v2/media?search=dona&per_page=20',
    ],
  },
  italiannis: {
    nombre: "Italianni's",
    aliases: ['italiannis', "italianni's", 'italianni'],
    sitio_web: 'https://www.italiannis.com.mx',
    urls: [
      'https://www.italiannis.com.mx/wp-json/wp/v2/posts?per_page=20',
    ],
  },
  vips: {
    nombre: 'Vips',
    aliases: ['vips'],
    sitio_web: 'https://www.vips.com.mx',
    urls: ['special:vips-home'],
  },
  walmart: {
    nombre: 'Walmart',
    aliases: ['walmart', 'walmart express', 'walmex'],
    sitio_web: 'https://www.walmart.com.mx',
    urls: ['special:walmart-tempo'],
  },
  // Soriana: Cloudflare bloquea fetch/API/lectores — sin endpoint estable por ahora
};

const SOURCE_CONFIG = Object.fromEntries(
  Object.entries(OFFICIAL_BRANDS).map(([slug, brand]) => [slug, brand.urls])
);

const lastCheckedByCompany = new Map();
const SOURCE_TTL_MS = 6 * 60 * 60 * 1000;

export const hasOfficialPromoSource = (slug) => Boolean(SOURCE_CONFIG[slug]?.length);
export const officialSourceSlugs = () => Object.keys(SOURCE_CONFIG);

const MONTHS = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

function clean(s = '') {
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;|\[&hellip;\]|\[…\]/gi, '…')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Resuelve una marca oficial a partir de nombre/brand OSM. */
export function resolveOfficialBrand(placeOrLabel) {
  const labels = (
    typeof placeOrLabel === 'string'
      ? [placeOrLabel]
      : [placeOrLabel?.brand, placeOrLabel?.operator, placeOrLabel?.name, placeOrLabel?.nombre]
  )
    .map(normalize)
    .filter(Boolean);

  if (!labels.length) return null;

  let best = null;
  for (const [slug, brand] of Object.entries(OFFICIAL_BRANDS)) {
    const keys = [
      normalize(slug),
      normalize(brand.nombre),
      ...(brand.aliases || []).map(normalize),
    ].filter(Boolean);

    for (const label of labels) {
      for (const key of keys) {
        const hit =
          label === key ||
          (key.length >= 4 && (label.includes(key) || key.includes(label))) ||
          (key.length === 3 && label === key);
        if (!hit) continue;
        const score = key.length + (label === key ? 100 : 0);
        if (!best || score > best.score) {
          best = {
            slug,
            nombre: brand.nombre,
            urls: brand.urls,
            sitio_web: brand.sitio_web,
            score,
          };
        }
      }
    }
  }
  return best
    ? {
        slug: best.slug,
        nombre: best.nombre,
        urls: best.urls,
        sitio_web: best.sitio_web,
      }
    : null;
}

/** Asegura documentos Empresa para marcas oficiales.
 *  @param places lugares OSM (opcional)
 *  @param {{ allConfigured?: boolean }} opts si allConfigured, upserta todas las fuentes del registry
 */
export async function ensureOfficialCompanies(places = [], opts = {}) {
  const wanted = new Map();
  for (const place of places) {
    const brand = resolveOfficialBrand(place);
    if (brand) wanted.set(brand.slug, brand);
  }
  if (opts.allConfigured) {
    for (const [slug, brand] of Object.entries(OFFICIAL_BRANDS)) {
      if (!wanted.has(slug)) {
        wanted.set(slug, { slug, nombre: brand.nombre, urls: brand.urls });
      }
    }
  }

  const companies = [];
  for (const brand of wanted.values()) {
    const doc = await Empresa.findOneAndUpdate(
      { slug: brand.slug },
      {
        $set: {
          nombre: brand.nombre,
          slug: brand.slug,
          estatus: 'activo',
          sitio_web:
            brand.sitio_web ||
            (brand.urls?.[0]?.startsWith('http') ? brand.urls[0] : ''),
        },
        $setOnInsert: {
          descripcion: `Cadena con promociones oficiales en TraGo (${brand.nombre}).`,
          imagen: brand.slug.slice(0, 2).toUpperCase(),
        },
      },
      { upsert: true, new: true }
    ).lean();
    companies.push(doc);
  }
  return companies;
}

function dates(text) {
  const m = text.match(
    /(?:del?\s+)?(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+(?:de|del)\s+(\d{4}))?\s+(?:al|a)\s+(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+(?:de|del)\s+(\d{4}))?/i
  );
  if (m) {
    const sm = MONTHS[m[2].toLowerCase()];
    const em = MONTHS[m[5].toLowerCase()];
    if (sm != null && em != null) {
      const year = new Date().getFullYear();
      const sy = Number(m[3] || m[6] || year);
      const ey = Number(m[6] || m[3] || year);
      return {
        start: new Date(sy, sm, Number(m[1])),
        end: new Date(ey, em, Number(m[4]), 23, 59, 59),
      };
    }
  }
  const until = text.match(
    /(?:hasta el|válida hasta el|vigencia.*?hasta.*?)\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(\d{4})/i
  );
  if (until) {
    const em = MONTHS[until[2].toLowerCase()];
    if (em != null) {
      return {
        start: null,
        end: new Date(Number(until[3]), em, Number(until[1]), 23, 59, 59),
      };
    }
  }
  return { start: null, end: null };
}

function classify(text) {
  const t = text.toLowerCase();
  return {
    alcohol: /cerveza|vino|licor|mezcal|tequila|whisky|alcohol|chela|buchanan|johnnie|ron\b/.test(
      t
    ),
    nocturno: /noche|happy hour|barra|shot/.test(t),
  };
}

function absUrl(src, pageUrl) {
  if (!src) return '';
  if (src.startsWith('//')) return `https:${src}`;
  if (src.startsWith('http')) return src;
  try {
    return new URL(src, pageUrl).href;
  } catch {
    return src;
  }
}

function parseCircleK(body, url) {
  const found = [];
  const headings = [...body.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)].map((m) =>
    clean(m[1])
  );
  const og = clean(
    body.match(/property="og:description"\s+content="([^"]+)"/i)?.[1] || ''
  );
  for (let i = 0; i < headings.length - 1; i++) {
    const title = headings[i];
    const deal = headings[i + 1];
    if (
      !title ||
      title.length < 4 ||
      /promociones|redes|sucursal|contigo/i.test(title) ||
      !/^(\d+\s*x\s*\$|\d+x\$|\d+%\s*off|más\s*\$)/i.test(deal)
    ) {
      continue;
    }
    const untilMatch = og.match(
      new RegExp(
        `${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,80}?Oferta válida hasta el ([^.]+)`,
        'i'
      )
    );
    const until = untilMatch?.[1] ? clean(untilMatch[1]) : '';
    found.push({
      title: `${title} — ${deal}`,
      description: until
        ? `${deal}. Oferta válida hasta el ${until}.`
        : `${deal}. Consulta vigencia en Circle K.`,
      sourceUrl: url,
      evidence: `${title} ${deal} ${until} promoción oferta`,
    });
    i++;
  }
  return found;
}

function parseHeb(body, url) {
  const found = [];
  const skip = /conoce todas|promociones exclusivas|descarga|políticas|vive saludable/i;
  for (const m of body.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)) {
    const title = clean(m[1]);
    if (title.length < 12 || title.length > 160 || skip.test(title)) continue;
    if (!/regala|2x|3x|descuento|oferta|promo|gratis|ll[eé]vate|\$/i.test(title)) continue;
    found.push({
      title,
      description: `Promoción publicada en heb.com.mx. Confirma vigencia en tienda.`,
      sourceUrl: url,
      evidence: `${title} promoción oferta`,
    });
  }
  return found;
}

function parseVtexDiscountSearch(body, url, company) {
  let products = [];
  try {
    products = JSON.parse(body);
  } catch {
    return [];
  }
  if (!Array.isArray(products)) return [];
  const found = [];
  for (const product of products) {
    const offer = product.items?.[0]?.sellers?.[0]?.commertialOffer;
    const price = Number(offer?.Price);
    const list = Number(offer?.ListPrice);
    const title = clean(product.productName || '');
    if (title.length < 4) continue;
    const hasDiscount =
      Number.isFinite(price) && Number.isFinite(list) && list > price && price > 0;
    if (!hasDiscount && !/promo|2x|3x|oferta/i.test(title)) continue;
    const discount = hasDiscount ? Math.round((1 - price / list) * 100) : 0;
    const linkText = product.linkText || '';
    const sourceUrl = product.link?.startsWith('http')
      ? product.link
      : product.link
        ? `https://www.chedraui.com.mx${product.link}`
        : linkText
          ? `https://www.chedraui.com.mx/${linkText}/p`
          : url;
    const img = product.items?.[0]?.images?.[0]?.imageUrl || '';
    found.push({
      title,
      description: hasDiscount
        ? `Descuento aprox. ${discount}% en sitio oficial: $${price.toFixed(2)} (antes $${list.toFixed(2)}). Confirma vigencia en sucursal.`
        : `Promoción publicada por ${company?.nombre || 'Chedraui'}.`,
      sourceUrl,
      image: absUrl(img, url),
      evidence: `${title} descuento oferta promoción ${discount}%`,
    });
  }
  return found;
}

function parseSevenElevenOfertas(body, url) {
  const found = [];
  const parts = body.split(/<h[1-4][^>]*>\s*Promos en /i);
  // TraGo es GDL: prioriza Jalisco; si no hay, usa todas las regiones
  const preferred = parts.slice(1).filter((part) =>
    /^Jalisco\b/i.test(clean(part.match(/^([^<]+)/)?.[1] || ''))
  );
  const sections = preferred.length ? preferred : parts.slice(1);
  for (const part of sections) {
    const city = clean(part.match(/^([^<]+)/)?.[1] || '');
    const chunk = part.slice(0, 25000);
    const imgs = [
      ...chunk.matchAll(
        /title="([^"]+)"[^>]*data-src="(https?:\/\/[^"]+)"|data-src="(https?:\/\/[^"]+)"[^>]*title="([^"]+)"/gi
      ),
    ].map((m) => ({ title: clean(m[1] || m[4] || ''), image: m[2] || m[3] || '' }));
    for (const item of imgs) {
      if (item.title.length < 4) continue;
      // Limpia códigos internos tipo "SQ-P1026-..."
      if (/^sq-p\d+/i.test(item.title)) continue;
      const pretty = item.title
        .replace(/\s*P\d+\s*\d*\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      found.push({
        title: pretty || item.title,
        description: `Oferta 7-Eleven${city ? ` · ${city}` : ''}. Vigencia y precio en tienda / app oficial.`,
        sourceUrl: url,
        image: item.image,
        evidence: `${item.title} ${city} promoción oferta 7-eleven`,
      });
    }
  }
  const seen = new Set();
  return found.filter((x) => {
    const k = slugify(x.title);
    if (!k || seen.has(k) || /^promos?\s+en\b/i.test(x.title)) return false;
    seen.add(k);
    return true;
  });
}

async function fetchBurgerKingOffers() {
  const sourceUrl = 'https://www.burgerking.com.mx/';
  const response = await fetch('https://use2-prod-bk-gateway.rbictg.com/graphql', {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-ui-language': 'es',
      'x-ui-platform': 'web',
      'x-ui-region': 'MX',
      'x-user-datetime': new Date().toISOString(),
      'apollographql-client-name': 'whitelabel-web',
    },
    body: JSON.stringify({
      query:
        'query { loyaltyOffers(omitInvalids: true) { id name startDate endDate type redemptionType } }',
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || 'GraphQL error');
  }
  const offers = payload.data?.loyaltyOffers || [];
  return offers
    .map((offer) => {
      const title = clean(offer.name || '');
      if (title.length < 3) return null;
      const start = offer.startDate ? new Date(offer.startDate) : null;
      const end = offer.endDate ? new Date(offer.endDate) : null;
      const endLabel =
        end && end.getFullYear() < 9000
          ? ` Hasta ${end.toLocaleDateString('es-MX')}.`
          : '';
      return {
        title,
        description: `Oferta oficial Burger King (app/web).${endLabel} Confirma vigencia y sucursal participante.`,
        sourceUrl,
        evidence: `${title} promoción oferta burger king ${offer.startDate || ''} ${offer.endDate || ''}`,
        start,
        end: end && end.getFullYear() < 9000 ? end : null,
      };
    })
    .filter(Boolean);
}

async function fetchMcdonaldsViaReader() {
  const sourceUrl = 'https://www.mcdonalds.com.mx/promociones';
  // Cloudflare bloquea Node; el lector HTTP a veces obtiene el HTML renderizado.
  const readerUrl = `https://r.jina.ai/http://www.mcdonalds.com.mx/promociones`;
  const response = await fetch(readerUrl, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/plain',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.text();
  if (/just a moment|cloudflare|enable javascript/i.test(body)) {
    throw new Error('Cloudflare bloquea la lectura automática de McDonald’s');
  }
  const found = [];
  const skip =
    /logo|header|sobre nosotros|trabaja|privacidad|restaurantes|quiénes|familia|receta|pedido|productos|markdown|image \d|https?:\/\//i;

  for (const line of body.split('\n')) {
    const raw = line.trim();
    if (!raw || raw.startsWith('![') || raw.startsWith('http') || raw.startsWith('[')) continue;
    const title = clean(raw.replace(/^#+\s*/, '').replace(/^\*\s*/, ''));
    if (title.length < 10 || title.length > 100 || skip.test(title)) continue;
    if (!/promo|cup[oó]n|2x1|descuento|oferta|combo|nugget|big mac|mcn[ií]fica|mcflurry|cajita/i.test(title)) {
      continue;
    }
    found.push({
      title,
      description: 'Oferta detectada en mcdonalds.com.mx. Confirma vigencia en app o restaurante.',
      sourceUrl,
      evidence: `${title} promoción oferta mcdonalds`,
    });
  }

  for (const m of body.matchAll(/!\[([^\]]{8,100})\]\((https?:\/\/[^)]+)\)/g)) {
    const title = clean(m[1]);
    if (skip.test(title)) continue;
    if (!/promo|oferta|combo|cup[oó]n|2x1|descuento|nugget|big mac|mcflurry/i.test(title)) continue;
    found.push({
      title,
      description: 'Promoción publicada en el sitio de McDonald’s México.',
      sourceUrl,
      image: m[2],
      evidence: `${title} promoción oferta mcdonalds`,
    });
  }

  const seen = new Set();
  return found.filter((x) => {
    const k = slugify(x.title);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseKrispyMedia(body, url) {
  let items = [];
  try {
    items = JSON.parse(body);
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];
  const found = [];
  for (const item of items) {
    const title = clean(item.title?.rendered || item.alt_text || '');
    if (title.length < 4) continue;
    if (/carrusel|icon_|logo/i.test(title)) continue;
    const pretty = title.replace(/^dona\s+/i, 'Dona ').replace(/-/g, ' ');
    found.push({
      title: pretty.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s+/g, ' ').trim(),
      description: 'Producto / promoción publicada en krispykreme.mx. Confirma vigencia en tienda.',
      sourceUrl: 'https://www.krispykreme.mx/promociones/',
      image: item.source_url || item.guid?.rendered || '',
      evidence: `${title} dona promoción oferta krispy`,
    });
  }
  const seen = new Set();
  return found.filter((x) => {
    const k = slugify(x.title);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseItaliannisPosts(body) {
  let items = [];
  try {
    items = JSON.parse(body);
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];
  const found = [];
  for (const post of items) {
    const title = clean(post.title?.rendered || '');
    if (title.length < 4) continue;
    if (/bases legales|aviso de privacidad|preguntas frecuentes/i.test(title)) continue;
    const excerpt = clean(post.excerpt?.rendered || '');
    const content = post.content?.rendered || '';
    const slug = post.slug || slugify(title);
    const fromContent = content.match(
      /<(?:img|source)[^>]+(?:src|data-src)="([^"]+)"/i
    );
    const image =
      post._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
      post.jetpack_featured_media_url ||
      fromContent?.[1] ||
      '';
    found.push({
      title,
      description:
        excerpt.slice(0, 500) ||
        'Promoción publicada en italiannis.com.mx. Confirma vigencia en restaurante.',
      sourceUrl: `https://www.italiannis.com.mx/${slug}/`,
      image: absUrl(image, 'https://www.italiannis.com.mx/'),
      evidence: `${title} ${excerpt} promoción oferta italiannis`,
    });
  }
  const seen = new Set();
  return found.filter((x) => {
    const k = slugify(x.title);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function titleFromSlug(slug = '') {
  return decodeURIComponent(String(slug))
    .replace(/[-_]+/g, ' ')
    .replace(/\bq\d+\b/gi, '')
    .replace(/\b\d{2,4}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchVipsHomeCampaigns() {
  const sourceUrl = 'https://www.vips.com.mx/';
  const body = await fetchPage(sourceUrl);
  const found = [];
  const seen = new Set();

  for (const m of body.matchAll(
    /href="(https?:\/\/(?:www\.)?vips\.com\.mx\/menu\/subcategoria\?c=([^"&#]+)[^"]*)"/gi
  )) {
    const href = m[1].replace('://vips.com.mx', '://www.vips.com.mx');
    const rawSlug = m[2];
    const title = titleFromSlug(rawSlug);
    if (title.length < 4) continue;
    // "Sopas" genérico sin campaña clara → omitir
    if (/^sopas$/i.test(title)) continue;
    const key = slugify(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const before = body.slice(Math.max(0, m.index - 900), m.index);
    const media = before.match(
      /(?:src|poster|data-src)="(https?:\/\/(?:www\.)?vips\.com\.mx\/images\/[^"]+)"/i
    );
    found.push({
      title,
      description:
        'Campaña destacada en vips.com.mx. Confirma precios y vigencia en sucursal.',
      sourceUrl: href.split('#')[0],
      image: (media?.[1] || '').replace('://vips.com.mx', '://www.vips.com.mx'),
      evidence: `${title} promoción oferta menú vips campaña`,
    });
  }

  // Bono gastronómico si aparece en home
  if (/bono\s*gastr/i.test(body) && !seen.has('bono-gastronomico')) {
    found.push({
      title: 'Bono Gastronómico',
      description: 'Beneficio publicado en vips.com.mx. Consulta condiciones en sitio o app.',
      sourceUrl,
      image: absUrl('/img/btnBono.png', sourceUrl),
      evidence: 'Bono Gastronómico promoción oferta vips',
    });
  }

  return found.slice(0, 20);
}

function parsePage(body, url, company) {
  const found = [];
  const companySlug = company?.slug || '';

  if (
    companySlug === 'krispy-kreme' ||
    /krispykreme\.mx\/wp-json\/wp\/v2\/media/i.test(url)
  ) {
    const media = parseKrispyMedia(body, url);
    if (media.length) return media.slice(0, 20);
  }

  if (
    companySlug === 'italiannis' ||
    /italiannis\.com\.mx\/wp-json\/wp\/v2\/posts/i.test(url)
  ) {
    const posts = parseItaliannisPosts(body);
    if (posts.length) return posts.slice(0, 20);
  }

  if (companySlug === '7-eleven' || /7-eleven\.com\.mx\/ofertas/i.test(url)) {
    const seven = parseSevenElevenOfertas(body, url);
    if (seven.length) return seven.slice(0, 40);
  }

  if (
    companySlug === 'chedraui' ||
    /\/api\/catalog_system\//i.test(url) ||
    body.trimStart().startsWith('[')
  ) {
    const vtex = parseVtexDiscountSearch(body, url, company);
    if (vtex.length) return vtex.slice(0, 40);
  }

  if (companySlug === 'circle-k' || /circlek\.com\.mx\/promociones/i.test(url)) {
    found.push(...parseCircleK(body, url));
  }
  if (companySlug === 'heb' || /heb\.com\.mx\/promociones/i.test(url)) {
    found.push(...parseHeb(body, url));
  }

  // OXXO: cards vía open_promo_image(...)
  for (const m of body.matchAll(
    /open_promo_image\('([^']+)','([^']*)','([^']*)','([^']*)','([^']*)'/g
  )) {
    const title = clean(m[2]);
    const category = clean(m[3]);
    const terms = clean(m[5]);
    if (title.length >= 4) {
      found.push({
        title,
        description: `${category}${terms ? ` · ${terms}` : ''}`.slice(0, 500),
        sourceUrl: url,
        image: absUrl(m[1], url),
        evidence: `${title} ${category} ${terms}`,
      });
    }
  }

  // La Europea (Shopify): tarjetas le-card__title + precio
  if (companySlug === 'la-europea' || body.includes('le-card__title')) {
    for (const m of body.matchAll(
      /<p class="le-card__title">([\s\S]*?)<\/p>\s*<div class="le-card__price">([\s\S]*?)<\/div>/gi
    )) {
      const title = clean(m[1]);
      const price = clean(m[2]);
      if (title.length < 4 || /^promociones$/i.test(title)) continue;
      const before = body.slice(Math.max(0, m.index - 1200), m.index);
      const img = before.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
      found.push({
        title,
        description: (
          price
            ? `Precio en sitio oficial: ${price}`
            : `Promoción publicada por ${company?.nombre || 'La Europea'}`
        ).slice(0, 500),
        sourceUrl: url,
        image: absUrl(img?.[1] || '', url),
        evidence: `${title} ${price} promoción oferta`,
      });
    }
  }

  // Genérico: headings con wording promocional
  for (const m of body.matchAll(
    /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>(?:\s*<(?:p|div)[^>]*>([\s\S]*?)<\/(?:p|div)>)?/gi
  )) {
    const title = clean(m[1]);
    const desc = clean(m[2] || '');
    if (
      title.length < 5 ||
      title.length > 120 ||
      /^promociones$/i.test(title) ||
      !/promo|2x1|3x2|descuento|oferta|combo|happy hour|regalo|beneficio|gratis|regala/i.test(
        `${title} ${desc}`
      )
    ) {
      continue;
    }
    found.push({
      title,
      description: desc.slice(0, 500),
      sourceUrl: url,
      evidence: `${title} ${desc}`,
    });
  }

  const seen = new Set();
  return found
    .filter((x) => {
      const k = slugify(x.title);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 40);
}

async function fetchStarbucksNext() {
  const sourceUrl = 'https://www.starbucks.com.mx/';
  const body = await fetchPage(sourceUrl);
  const match = body.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) throw new Error('Sin __NEXT_DATA__ en Starbucks');
  const data = JSON.parse(match[1]);
  const grids = data.props?.pageProps?.grids || [];
  const found = [];
  for (const grid of grids) {
    const title = clean(grid.title || grid.image?.alt || '');
    const text = clean(grid.text || '');
    if (title.length < 4) continue;
    if (/undefined|^$/.test(title)) continue;
    found.push({
      title,
      description:
        text.slice(0, 400) ||
        'Campaña publicada en starbucks.com.mx. Confirma vigencia en tienda o app.',
      sourceUrl,
      image: grid.image?.url || '',
      evidence: `${title} ${text} promoción oferta starbucks`,
    });
  }
  return found;
}

function isWalmartAssetName(title = '') {
  return (
    /^\d{6,}/.test(title) ||
    /oh-desk|oh-skbp|gpov|wmc back|_colle_|_gpov_/i.test(title) ||
    /^[a-z0-9-]{20,}$/i.test(title)
  );
}

function isWalmartPromoTitle(title = '', desc = '') {
  const t = `${title} ${desc}`;
  if (title.length < 10 || title.length > 140) return false;
  if (isWalmartAssetName(title)) return false;
  if (
    /^(compra ahora|descubre m[aá]s|walmart deals|marcas destacadas|productos recomendados|wp octubre)$/i.test(
      title
    )
  ) {
    return false;
  }
  return /ahorro|%|msi|precio|promo|oferta|hasta|bonific|descuento|2x1|flash|pass|navidad|cyber|cashi|bancari|lanzamiento|frescura|belleza|liquidaci[oó]n|esenciales|s[uú]per/i.test(
    t
  );
}

async function fetchWalmartTempoCampaigns() {
  const sourceUrl = 'https://www.walmart.com.mx/';
  const body = await fetchPage(sourceUrl, 25000);
  const match = body.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) throw new Error('Sin __NEXT_DATA__ en Walmart');
  const props = JSON.parse(match[1]).props?.pageProps || {};
  const modules =
    props.initialTempoData?.data?.contentLayout?.modules ||
    props.initialTempoData?.contentLayout?.modules ||
    [];

  const found = [];
  const seen = new Set();

  const push = (title, description, image) => {
    const cleanTitle = clean(title);
    const cleanDesc = clean(description || '');
    if (!isWalmartPromoTitle(cleanTitle, cleanDesc)) return;
    const key = slugify(cleanTitle);
    if (!key || seen.has(key)) return;
    seen.add(key);
    found.push({
      title: cleanTitle,
      description:
        cleanDesc.slice(0, 400) ||
        'Campaña publicada en walmart.com.mx. Confirma vigencia y disponibilidad en tienda o línea.',
      sourceUrl: 'https://www.walmart.com.mx/content/ofertas',
      image: image || '',
      evidence: `${cleanTitle} ${cleanDesc} promoción oferta walmart`,
    });
  };

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const title =
      node.skinnyBannerHeading ||
      node.heading ||
      node.headline ||
      node.title ||
      node.alt ||
      node.ariaLabel ||
      '';
    const desc =
      node.subHeading ||
      node.subTitle ||
      node.subtitle ||
      node.description ||
      node.alt ||
      '';
    const image =
      node.src ||
      node.image?.src ||
      node.bannerImage?.src ||
      node.desktopImage?.src ||
      node.mobileImage?.src ||
      '';
    if (typeof title === 'string') push(title, typeof desc === 'string' ? desc : '', image);
    for (const [k, v] of Object.entries(node)) {
      if (['__typename', '_rawConfigs', 'athModule', 'spBeaconInfo'].includes(k)) continue;
      if (typeof v === 'object') walk(v);
    }
  };

  for (const mod of modules) {
    // Saltar carruseles de producto (cargan vía GraphQL bloqueado)
    if (/ItemCarousel|SponsoredProduct|DisplayAd/i.test(mod.type || '')) continue;
    walk(mod.configs || {});
  }

  // Banner Skinny de /content/ofertas (Precios que no se tocan, etc.)
  try {
    const ofertasBody = await fetchPage(
      'https://www.walmart.com.mx/content/ofertas',
      20000
    );
    const ofertasMatch = ofertasBody.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (ofertasMatch) {
      const ofProps = JSON.parse(ofertasMatch[1]).props?.pageProps || {};
      const ofModules =
        ofProps.initialTempoData?.contentLayout?.modules ||
        ofProps.initialTempoData?.data?.contentLayout?.modules ||
        [];
      for (const mod of ofModules) {
        if (!/SkinnyBanner|POV|Hero|Card/i.test(mod.type || '')) continue;
        walk(mod.configs || {});
      }
    }
  } catch {
    // Home ya aporta campañas; ofertas es refuerzo
  }

  return found.slice(0, 30);
}

async function fetchSourceHits(url, company) {
  if (url === 'special:burger-king-loyalty') {
    return { url: 'https://www.burgerking.com.mx/', hits: await fetchBurgerKingOffers(), error: null };
  }
  if (url === 'special:mcdonalds-reader') {
    return {
      url: 'https://www.mcdonalds.com.mx/promociones',
      hits: await fetchMcdonaldsViaReader(),
      error: null,
    };
  }
  if (url === 'special:starbucks-next') {
    return {
      url: 'https://www.starbucks.com.mx/',
      hits: await fetchStarbucksNext(),
      error: null,
    };
  }
  if (url === 'special:vips-home') {
    return {
      url: 'https://www.vips.com.mx/',
      hits: await fetchVipsHomeCampaigns(),
      error: null,
    };
  }
  if (url === 'special:walmart-tempo') {
    return {
      url: 'https://www.walmart.com.mx/',
      hits: await fetchWalmartTempoCampaigns(),
      error: null,
    };
  }
  const body = await fetchPage(url);
  return { url, hits: parsePage(body, url, company), error: null };
}

async function fetchPage(url, timeoutMs = 22000) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-MX,es;q=0.9',
    },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

/** Importa promociones oficiales con solicitudes concurrentes. */
export async function collectNearbyPromos(companies) {
  return Promise.all(
    companies.map(async (company) => {
      const companyId = String(company._id);
      const cached = lastCheckedByCompany.get(companyId);
      if (cached && Date.now() - cached.at < SOURCE_TTL_MS) return cached.report;

      const urls = SOURCE_CONFIG[company.slug];
      if (!urls?.length) {
        const report = {
          empresa: company.nombre,
          ok: false,
          count: 0,
          reason: 'sin fuente compatible configurada',
        };
        lastCheckedByCompany.set(companyId, { at: Date.now(), report });
        return report;
      }

      const results = await Promise.all(
        urls.map(async (url) => {
          try {
            return await fetchSourceHits(url, company);
          } catch (error) {
            return { url, hits: [], error: `${url}: ${error.message}` };
          }
        })
      );
      const errors = results.flatMap((result) => (result.error ? [result.error] : []));
      const uniqueHits = new Map();
      for (const result of results) {
        for (const hit of result.hits) {
          const key = slugify(hit.title);
          if (key) uniqueHits.set(key, hit);
        }
      }

      const now = new Date();
      const operations = [...uniqueHits.values()].map((hit) => {
        const key = crypto
          .createHash('sha1')
          .update(`${companyId}:${slugify(hit.title)}`)
          .digest('hex')
          .slice(0, 16);
        const fromHit =
          hit.start || hit.end
            ? { start: hit.start || null, end: hit.end || null }
            : dates(hit.evidence);
        const { start, end } = fromHit;
        const flags = classify(hit.evidence);
        return {
          updateOne: {
            filter: { slug: `oficial-${key}` },
            update: {
              $set: {
                slug: `oficial-${key}`,
                id_empresa: company._id,
                nombre: hit.title,
                descripcion:
                  hit.description || `Promoción publicada por ${company.nombre}.`,
                politicas: `Fuente oficial consultada automáticamente. ${
                  start && end
                    ? 'Vigencia extraída del texto publicado.'
                    : 'La página no indicó fechas legibles; confirma vigencia y condiciones con la empresa.'
                }`,
                imagen: hit.image || company.imagen || '',
                origen: 'oficial',
                url_fuente: hit.sourceUrl,
                inicia_en: start,
                termina_en: end,
                alcohol: flags.alcohol,
                audiencia: flags.alcohol ? 'adulto' : 'todos',
                nocturno: flags.nocturno,
                estatus: end && end < now ? 'caduco' : 'activo',
                destacada: false,
              },
            },
            upsert: true,
          },
        };
      });
      if (operations.length) {
        await Promocion.bulkWrite(operations, { ordered: false });
        const keepSlugs = operations.map((op) => op.updateOne.filter.slug);
        await Promocion.updateMany(
          {
            id_empresa: company._id,
            origen: 'oficial',
            slug: { $nin: keepSlugs },
            estatus: 'activo',
          },
          { $set: { estatus: 'caduco' } }
        );
      } else if (!errors.length) {
        // Fuente respondió pero sin ofertas legibles: caducar basura previa
        await Promocion.updateMany(
          { id_empresa: company._id, origen: 'oficial', estatus: 'activo' },
          { $set: { estatus: 'caduco' } }
        );
      }

      const report = {
        empresa: company.nombre,
        ok: errors.length < urls.length,
        count: operations.length,
        ...(errors.length ? { errors } : {}),
        ...(operations.length === 0 && !errors.length
          ? { reason: 'sitio sin promociones legibles en esta consulta' }
          : {}),
      };
      // No cachear fallos totales: permite reintento en la siguiente consulta
      if (!(errors.length && operations.length === 0)) {
        lastCheckedByCompany.set(companyId, { at: Date.now(), report });
      }
      return report;
    })
  );
}
