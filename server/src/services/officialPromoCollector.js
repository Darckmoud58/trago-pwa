import crypto from 'node:crypto';
import Promocion from '../models/Promocion.js';
import Empresa from '../models/Empresa.js';
import { linkOfficialPromoIfSourceNamesBranch } from './promoBranchLinks.js';
import { looksLikeAlcohol } from '../lib/ageGate.js';
import { parsePromoPrice, resolvePromoPrice } from '../lib/promoPrice.js';

// UA de navegador: FG/Demandware y otros CDN responden 403 al bot corto.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 TraGoPromoCollector/1.1';

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
    // Liferay (ya no Next.js / __NEXT_DATA__)
    urls: ['special:starbucks-home'],
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
            OFFICIAL_BRANDS[brand.slug]?.sitio_web ||
            (brand.urls?.[0]?.startsWith('http') ? brand.urls[0] : ''),
        },
        $setOnInsert: {
          descripcion: `Cadena con promociones oficiales en TraGo (${brand.nombre}).`,
          imagen: '',
        },
      },
      { upsert: true, new: true }
    ).lean();
    // Iniciales tipo "BU"/"OX" no son URLs — no sirven como fallback de imagen.
    if (doc?.imagen && !/^https?:\/\//i.test(String(doc.imagen))) {
      await Empresa.updateOne({ _id: doc._id }, { $set: { imagen: '' } });
      doc.imagen = '';
    }
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
  const t = String(text || '').toLowerCase();
  return {
    alcohol: looksLikeAlcohol(t),
    nocturno: /noche|happy hour|barra|shot/.test(t),
  };
}

function absUrl(src, pageUrl) {
  if (!src) return '';
  let cleaned = String(src)
    .replace(/&amp;/gi, '&')
    .trim()
    .split(/\s+/)[0];
  if (cleaned.includes(',')) {
    cleaned = cleaned.split(',')[0].trim().split(/\s+/)[0];
  }
  if (cleaned.startsWith('//')) cleaned = `https:${cleaned}`;
  if (cleaned.startsWith('http')) {
    // HEB y otros Next: /_next/image?url=https%3A%2F%2F… → asset real
    try {
      const u = new URL(cleaned);
      if (/\/_next\/image\/?$/i.test(u.pathname) && u.searchParams.get('url')) {
        return absUrl(u.searchParams.get('url'), pageUrl);
      }
    } catch {
      /* keep */
    }
    return cleaned;
  }
  if (!pageUrl) return '';
  try {
    return new URL(cleaned, pageUrl).href;
  } catch {
    return '';
  }
}

/** Solo persiste URLs http(s) de imagen; nunca iniciales de marca ni paths rotos. */
function sanitizePromoImage(src, pageUrl = '') {
  const href = absUrl(src, pageUrl);
  if (!/^https?:\/\//i.test(href)) return '';
  if (/^data:/i.test(href)) return '';
  if (
    /\/(?:logo|icon|sprite|favicon|brand)(?:[-_.][^/]*)?\.(?:png|jpe?g|webp|gif|svg)(?:$|\?)/i.test(
      href
    )
  ) {
    return '';
  }
  if (/\.(svg)(?:$|\?)/i.test(href) && /logo|icon|sprite|favicon/i.test(href)) {
    return '';
  }
  if (/1x1|pixel|spacer|blank\.gif|transparent/i.test(href)) return '';
  return href;
}

function pageOgImage(body, pageUrl) {
  if (!body) return '';
  const og =
    body.match(
      /property=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/i
    )?.[1] ||
    body.match(
      /content=["']([^"']+)["']\s+property=["']og:image(?::secure_url)?["']/i
    )?.[1] ||
    body.match(/name=["']twitter:image["']\s+content=["']([^"']+)["']/i)?.[1] ||
    '';
  return sanitizePromoImage(og, pageUrl);
}

/** Demandware/Shopify: Product.image en JSON-LD cuando no hay og:image. */
function pageJsonLdProductImage(body, pageUrl) {
  if (!body) return '';
  for (const m of body.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      const data = JSON.parse(m[1]);
      const nodes = [];
      const push = (n) => {
        if (!n) return;
        if (Array.isArray(n)) n.forEach(push);
        else nodes.push(n);
      };
      push(data);
      if (data?.['@graph']) push(data['@graph']);
      for (const node of nodes) {
        const type = String(node['@type'] || '');
        if (!/Product/i.test(type)) continue;
        const raw = node.image;
        const candidates = Array.isArray(raw)
          ? raw
          : typeof raw === 'string'
            ? [raw]
            : raw?.url
              ? [raw.url]
              : [];
        for (const c of candidates) {
          const img = sanitizePromoImage(
            typeof c === 'string' ? c : c?.url || '',
            pageUrl
          );
          if (img) return img;
        }
      }
    } catch {
      /* JSON-LD roto — sigue */
    }
  }
  return '';
}

function pagePrimaryImage(body, pageUrl) {
  return (
    pageOgImage(body, pageUrl) || pageJsonLdProductImage(body, pageUrl) || ''
  );
}

const IMG_ATTR_RE =
  /(?:src|data-src|data-srcset|srcset|data-lazy-src|data-original)=["']([^"']+)["']/gi;

/** Primera URL usable de src / srcset. */
function firstSrcFromAttr(raw, pageUrl) {
  if (!raw) return '';
  const candidate = String(raw)
    .replace(/&amp;/gi, '&')
    .split(',')[0]
    .trim()
    .split(/\s+/)[0];
  return sanitizePromoImage(candidate, pageUrl);
}

function imageNearMatch(body, index, pageUrl) {
  if (!body || index == null || index < 0) return '';
  // Ventana amplia: Shopify/cards meten el <img> lejos del título.
  const windowStart = Math.max(0, index - 4200);
  const windowEnd = Math.min(body.length, index + 2200);
  const before = body.slice(windowStart, index);
  const around = body.slice(windowStart, windowEnd);
  const lastSrc = before.match(IMG_ATTR_RE);
  if (lastSrc?.length) {
    const m = lastSrc[lastSrc.length - 1].match(/["']([^"']+)["']/);
    const img = firstSrcFromAttr(m?.[1] || '', pageUrl);
    if (img && !/logo|icon|sprite|banner|placeholder|pixel|favicon/i.test(img)) {
      return img;
    }
  }
  const aroundImgs = [...around.matchAll(IMG_ATTR_RE)];
  for (let i = aroundImgs.length - 1; i >= 0; i--) {
    const img = firstSrcFromAttr(aroundImgs[i][1], pageUrl);
    if (!img) continue;
    if (/logo|icon|sprite|banner|placeholder|pixel|favicon/i.test(img)) continue;
    return img;
  }
  return '';
}

/** Empareja imagen cuyo path/alt contiene tokens del título (Dobel → MaestroDobel…). */
function imageByTitleTokens(body, title, pageUrl, nearIndex = null) {
  if (!body || !title) return '';
  const stop = new Set([
    'promo',
    'oferta',
    'variedad',
    'solo',
    'hasta',
    'descuento',
    'tabletas',
    'pack',
    'combo',
    'gratis',
    'promocion',
    'promociones',
  ]);
  const tokens = (normalize(title).match(/[a-z0-9]{4,}/g) || []).filter(
    (t) => !stop.has(t)
  );
  if (!tokens.length) return '';

  const scope =
    nearIndex != null
      ? body.slice(
          Math.max(0, nearIndex - 5500),
          Math.min(body.length, nearIndex + 2800)
        )
      : body.slice(0, Math.min(body.length, 600_000));

  let best = '';
  let bestScore = 0;
  for (const m of scope.matchAll(IMG_ATTR_RE)) {
    const img = firstSrcFromAttr(m[1], pageUrl);
    if (!img) continue;
    if (/logo|icon|sprite|banner|placeholder|pixel|favicon|\.svg(?:$|\?)/i.test(img)) {
      continue;
    }
    const u = normalize(img);
    let score = 0;
    for (const t of tokens) {
      if (u.includes(t)) score += t.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = img;
    }
  }
  return bestScore >= 5 ? best : '';
}

/**
 * Si la URL de imagen nombra otra marca/producto que el título, la descarta.
 * Evita cruces tipo Act II con foto de Maruchan (OG genérico de la página).
 */
function imageConflictsWithTitle(title, imageUrl) {
  if (!title || !imageUrl) return false;
  let path = imageUrl;
  try {
    path = decodeURIComponent(imageUrl);
  } catch {
    /* keep raw */
  }
  const t = normalize(title);
  const u = normalize(path);
  const markers = [
    { tag: 'maruchan', keys: ['maruchan', 'instantlunch', 'camarones'] },
    { tag: 'actii', keys: ['actii', 'act2', 'act-ii', 'palomitasact'] },
    { tag: 'doritos', keys: ['doritos'] },
    { tag: 'ruffles', keys: ['ruffles'] },
    { tag: 'cheetos', keys: ['cheetos'] },
    { tag: 'sabritas', keys: ['sabritas'] },
    { tag: 'coca', keys: ['coca', 'cocacola'] },
    { tag: 'pepsi', keys: ['pepsi'] },
    { tag: 'gatorade', keys: ['gatorade'] },
    { tag: 'snickers', keys: ['snickers'] },
    { tag: 'mnm', keys: ['mms', 'mandms'] },
  ];
  let titleTag = '';
  let urlTag = '';
  for (const m of markers) {
    if (!titleTag && m.keys.some((k) => t.includes(normalize(k)))) {
      titleTag = m.tag;
    }
    if (!urlTag && m.keys.some((k) => u.includes(normalize(k)))) {
      urlTag = m.tag;
    }
  }
  return Boolean(titleTag && urlTag && titleTag !== urlTag);
}

function pickPromoImage(title, image, pageUrl = '') {
  const img = sanitizePromoImage(image, pageUrl);
  if (!img) return '';
  if (imageConflictsWithTitle(title, img)) return '';
  return img;
}

/**
 * Si la fuente es solo el home de la cadena, manda a la sección de ofertas.
 * Si ya es una URL profunda (producto/campaña), se respeta.
 */
function deepenOfficialSourceUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '') || '/';
    const isHome = path === '/' || path === '';

    const deepLinks = {
      'burgerking.com.mx': 'https://www.burgerking.com.mx/cuponeras',
      'mcdonalds.com.mx': 'https://www.mcdonalds.com.mx/promociones',
      'starbucks.com.mx': 'https://www.starbucks.com.mx/',
      'vips.com.mx': 'https://www.vips.com.mx/menu',
      'walmart.com.mx': 'https://www.walmart.com.mx/content/ofertas',
      'kfc.com.mx': 'https://kfc.com.mx/',
      'oxxo.com': 'https://www.oxxo.com/promociones',
      'heb.com.mx': 'https://www.heb.com.mx/promociones',
      'circlek.com.mx': 'https://circlek.com.mx/promociones/',
      '7-eleven.com.mx': 'https://7-eleven.com.mx/ofertas/',
      'laeuropea.com.mx': 'https://laeuropea.com.mx/collections/promociones',
      'krispykreme.mx': 'https://www.krispykreme.mx/promociones/',
      'italiannis.com.mx': 'https://www.italiannis.com.mx/',
      'chedraui.com.mx': 'https://www.chedraui.com.mx/',
    };

    if (isHome && deepLinks[host]) return deepLinks[host];
    return u.href;
  } catch {
    return url;
  }
}

function finalizeHit(hit, pageUrl, pageBody = '') {
  const sourceUrl = deepenOfficialSourceUrl(hit.sourceUrl || pageUrl || '');
  let image = pickPromoImage(hit.title, hit.image, pageUrl || sourceUrl);
  if (!image && pageBody && hit._matchIndex != null) {
    image = pickPromoImage(
      hit.title,
      imageNearMatch(pageBody, hit._matchIndex, pageUrl) ||
        imageByTitleTokens(pageBody, hit.title, pageUrl, hit._matchIndex),
      pageUrl
    );
  }
  if (!image && pageBody && hit.title) {
    image = pickPromoImage(
      hit.title,
      imageByTitleTokens(pageBody, hit.title, pageUrl, hit._matchIndex ?? null),
      pageUrl
    );
  }
  // OG/JSON-LD de página solo si es la única promo del batch (si no, cruza marcas).
  if (!image && pageBody && hit._allowOgFallback) {
    image = pickPromoImage(
      hit.title,
      pagePrimaryImage(pageBody, pageUrl),
      pageUrl
    );
  }
  const { _matchIndex, _allowOgFallback, ...rest } = hit;
  return { ...rest, sourceUrl, image };
}

function parseCircleK(body, url) {
  const found = [];
  const headingMatches = [
    ...body.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi),
  ].map((m) => ({ text: clean(m[1]), index: m.index ?? 0 }));
  const og = clean(
    body.match(/property="og:description"\s+content="([^"]+)"/i)?.[1] || ''
  );
  for (let i = 0; i < headingMatches.length - 1; i++) {
    const title = headingMatches[i].text;
    const deal = headingMatches[i + 1].text;
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
    const fullTitle = `${title} — ${deal}`;
    // Imagen local al heading — NUNCA el og:image de toda la página (cruzaba Maruchan/Act II).
    const localImg = pickPromoImage(
      fullTitle,
      imageNearMatch(body, headingMatches[i].index, url),
      url
    );
    found.push({
      title: fullTitle,
      description: until
        ? `${deal}. Oferta válida hasta el ${until}.`
        : `${deal}. Consulta vigencia en Circle K.`,
      sourceUrl: url,
      image: localImg,
      evidence: `${title} ${deal} ${until} promoción oferta`,
      _matchIndex: headingMatches[i].index,
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
      image: pickPromoImage(
        title,
        imageNearMatch(body, m.index, url),
        url
      ),
      evidence: `${title} promoción oferta`,
      _matchIndex: m.index,
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
      price: hasDiscount || Number.isFinite(price) ? price : null,
      listPrice: hasDiscount ? list : null,
      priceText: Number.isFinite(price) && price > 0
        ? `$${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`
        : '',
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

const BK_SANITY_PROJECT = 'czqk28jt';
const BK_SANITY_DATASET = 'prod_bk_mx';

/** Resuelve URLs de imagen CMS (Sanity) a partir de sanityId de cada oferta BK. */
async function fetchBurgerKingSanityImages(sanityIds = []) {
  const ids = [...new Set(sanityIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const byId = new Map();
  const chunkSize = 40;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const query = `*[_id in $ids]{
      _id,
      "image": coalesce(
        localizedImage.es.app.asset->url,
        localizedImage.en.app.asset->url,
        localizedImage.es.app.asset->url,
        backgroundImage.asset->url
      )
    }`;
    const url = new URL(
      `https://${BK_SANITY_PROJECT}.apicdn.sanity.io/v2023-08-01/data/query/${BK_SANITY_DATASET}`
    );
    url.searchParams.set('query', query);
    url.searchParams.set('$ids', JSON.stringify(chunk));
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) continue;
    const payload = await res.json();
    for (const row of payload.result || []) {
      const img = sanitizePromoImage(row?.image || '');
      if (row?._id && img) byId.set(row._id, img);
    }
  }
  return byId;
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
        'query { loyaltyOffers(omitInvalids: true) { id name sanityId startDate endDate type redemptionType } }',
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || 'GraphQL error');
  }
  const offers = payload.data?.loyaltyOffers || [];
  const images = await fetchBurgerKingSanityImages(
    offers.map((o) => o.sanityId).filter(Boolean)
  );
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
        sourceUrl: deepenOfficialSourceUrl(sourceUrl),
        image: images.get(offer.sanityId) || '',
        evidence: `${title} promoción oferta burger king ${offer.startDate || ''} ${offer.endDate || ''}`,
        start,
        end: end && end.getFullYear() < 9000 ? end : null,
      };
    })
    .filter(Boolean);
}

/**
 * McDonald’s: no usar terceros (r.jina.ai) como "oficial".
 * Cloudflare bloquea Node; hasta tener lectura directa legible, no inventamos.
 */
async function fetchMcdonaldsViaReader() {
  throw new Error(
    'McDonald’s: sin lectura directa legible (no se usa intermediario). Confirma en mcdonalds.com.mx.'
  );
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

  // OXXO: cards vía open_promo_image(img, title, category, link?, terms)
  for (const m of body.matchAll(
    /open_promo_image\('([^']+)','([^']*)','([^']*)','([^']*)','([^']*)'/g
  )) {
    const title = clean(m[2]);
    const category = clean(m[3]);
    const maybeLink = clean(m[4] || '');
    const terms = clean(m[5]);
    if (title.length >= 4) {
      const deep =
        /^https?:\/\//i.test(maybeLink)
          ? maybeLink
          : maybeLink.startsWith('/')
            ? absUrl(maybeLink, url)
            : url;
      found.push({
        title,
        description: `${category}${terms ? ` · ${terms}` : ''}`.slice(0, 500),
        sourceUrl: deep || url,
        image: sanitizePromoImage(m[1], url),
        evidence: `${title} ${category} ${terms}`,
        _matchIndex: m.index,
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
      const local =
        imageByTitleTokens(body, title, url, m.index) ||
        imageNearMatch(body, m.index, url);
      found.push({
        title,
        description: (
          price
            ? `Precio en sitio oficial: ${price}`
            : `Promoción publicada por ${company?.nombre || 'La Europea'}`
        ).slice(0, 500),
        sourceUrl: url,
        image: pickPromoImage(title, local, url),
        evidence: `${title} ${price} promoción oferta`,
        _matchIndex: m.index,
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
      image: imageNearMatch(body, m.index, url),
      evidence: `${title} ${desc}`,
      _matchIndex: m.index,
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
    .map((hit) => finalizeHit(hit, url, body))
    .slice(0, 40);
}

/**
 * Starbucks MX pasó de Next.js a Liferay: banners block--banner + /documents/…
 * Las URLs viejas djftrby1k8irl.cloudfront.net/s3fs-public ya no sirven (text/plain).
 */
async function fetchStarbucksHome() {
  const sourceUrl = 'https://www.starbucks.com.mx/';
  const body = await fetchPage(sourceUrl);
  const found = [];
  const seen = new Set();

  const push = (title, description, image, matchIndex) => {
    const t = clean(title);
    if (t.length < 4 || /^home$/i.test(t)) return;
    if (/noticias|promociones$/i.test(t) && t.length < 16) return;
    const key = slugify(t);
    if (!key || seen.has(key)) return;
    seen.add(key);
    found.push({
      title: t,
      description:
        clean(description).slice(0, 400) ||
        'Campaña publicada en starbucks.com.mx. Confirma vigencia en tienda o app.',
      sourceUrl,
      image: pickPromoImage(t, image, sourceUrl),
      evidence: `${t} ${description || ''} promoción oferta starbucks`,
      _matchIndex: matchIndex,
      _allowOgFallback: false,
    });
  };

  // Bloques banner: imagen + h1.title (+ abstract opcional)
  for (const m of body.matchAll(
    /block--banner[\s\S]{0,4500}?<img[^>]+src=["']([^"']+)["'][\s\S]{0,2500}?<h1[^>]*>([\s\S]*?)<\/h1>(?:[\s\S]{0,1200}?field-abstract[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>)?/gi
  )) {
    push(m[2], m[3] || '', absUrl(m[1], sourceUrl), m.index);
  }

  // Fallback: títulos h1.title con imagen cercana / adaptive-media
  if (found.length < 2) {
    for (const m of body.matchAll(
      /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/gi
    )) {
      const title = clean(m[1]);
      const local =
        imageNearMatch(body, m.index, sourceUrl) ||
        imageByTitleTokens(body, title, sourceUrl, m.index);
      push(title, '', local, m.index);
    }
  }

  if (!found.length) {
    throw new Error('Starbucks Liferay sin banners legibles');
  }

  return found
    .map((hit) => finalizeHit(hit, sourceUrl, body))
    .slice(0, 20);
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

  const push = (title, description, image, link) => {
    const cleanTitle = clean(title);
    const cleanDesc = clean(description || '');
    if (!isWalmartPromoTitle(cleanTitle, cleanDesc)) return;
    const key = slugify(cleanTitle);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const deep =
      typeof link === 'string' && /^https?:\/\//i.test(link)
        ? link
        : typeof link === 'string' && link.startsWith('/')
          ? absUrl(link, 'https://www.walmart.com.mx')
          : 'https://www.walmart.com.mx/content/ofertas';
    found.push({
      title: cleanTitle,
      description:
        cleanDesc.slice(0, 400) ||
        'Campaña publicada en walmart.com.mx. Confirma vigencia y disponibilidad en tienda o línea.',
      sourceUrl: deepenOfficialSourceUrl(deep),
      image: sanitizePromoImage(image || '', 'https://www.walmart.com.mx'),
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
    const link =
      node.clickThrough?.value ||
      node.clickThrough?.clickThrough ||
      node.ctaLink ||
      node.link ||
      node.url ||
      node.href ||
      '';
    if (typeof title === 'string') {
      push(title, typeof desc === 'string' ? desc : '', image, link);
    }
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
    try {
      const hits = await fetchMcdonaldsViaReader();
      return {
        url: 'https://www.mcdonalds.com.mx/promociones',
        hits,
        error: null,
      };
    } catch (e) {
      return {
        url: 'https://www.mcdonalds.com.mx/promociones',
        hits: [],
        error: e.message || 'Sin lectura oficial legible',
      };
    }
  }
  if (url === 'special:starbucks-home' || url === 'special:starbucks-next') {
    return {
      url: 'https://www.starbucks.com.mx/',
      hits: await fetchStarbucksHome(),
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
  let href = url;
  try {
    const u = new URL(url);
    if (u.protocol === 'http:') u.protocol = 'https:';
    href = u.href;
  } catch {
    href = url;
  }
  const response = await fetch(href, {
    headers: {
      'User-Agent': UA,
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
    },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function isListingSourceUrl(href) {
  return (
    /\/promociones\/?$/i.test(href) ||
    /\/promociones\.html$/i.test(href) ||
    /\/ofertas\/?$/i.test(href) ||
    /\/menu\/?$/i.test(href) ||
    /tienda\/promociones/i.test(href) ||
    /collections\/promociones/i.test(href)
  );
}

/**
 * Rellena imagen desde la URL oficial ya guardada (ficha o listado).
 * No inventa: JSON-LD / OG / img cercana al título en el HTML de la fuente.
 */
export async function backfillMissingProductImages(empresaId, limit = 20) {
  const missing = await Promocion.find({
    id_empresa: empresaId,
    origen: 'oficial',
    estatus: 'activo',
    $or: [{ imagen: '' }, { imagen: null }, { imagen: { $exists: false } }],
    url_fuente: { $regex: /^https?:\/\//i },
    nombre: { $exists: true, $nin: ['', null] },
  })
    .select('_id nombre url_fuente')
    .limit(limit)
    .lean();

  const listingCache = new Map();
  let filled = 0;

  for (const promo of missing) {
    const href = String(promo.url_fuente || '');
    const listing = isListingSourceUrl(href);
    try {
      let body = listingCache.get(href);
      if (body == null) {
        body = await fetchPage(href, listing ? 22_000 : 12_000);
        if (listing) listingCache.set(href, body);
      }
      const idx = body.indexOf(String(promo.nombre || '').slice(0, 48));
      const near =
        idx >= 0 ? imageNearMatch(body, idx, href) : '';
      const byTokens = imageByTitleTokens(
        body,
        promo.nombre,
        href,
        idx >= 0 ? idx : null
      );
      const primary = listing
        ? ''
        : pagePrimaryImage(body, href);
      const img = pickPromoImage(
        promo.nombre,
        near || byTokens || primary,
        href
      );
      if (!img) continue;
      await Promocion.updateOne({ _id: promo._id }, { $set: { imagen: img } });
      filled += 1;
    } catch {
      /* página caída o bloqueada — se reintenta en el próximo job */
    }
  }
  return filled;
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
      let linkedFromSource = 0;
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
        const priced = resolvePromoPrice({
          precio: hit.price ?? hit.precio,
          precioLista: hit.listPrice ?? hit.precio_lista,
          precioTexto: hit.priceText ?? hit.precio_texto,
          title: hit.title,
          description: hit.description,
        });
        // Si el scraper no trae cifra, intenta del título (2X$48, Lunch King $99…).
        const fromTitle =
          priced.precio != null
            ? priced
            : parsePromoPrice(`${hit.title || ''} ${hit.description || ''}`);
        const nextImage = pickPromoImage(
          hit.title,
          hit.image || '',
          hit.sourceUrl || ''
        );
        const $set = {
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
          origen: 'oficial',
          url_fuente: deepenOfficialSourceUrl(hit.sourceUrl || ''),
          inicia_en: start,
          termina_en: end,
          alcohol: flags.alcohol,
          audiencia: flags.alcohol ? 'adulto' : 'todos',
          nocturno: flags.nocturno,
          estatus: end && end < now ? 'caduco' : 'activo',
          destacada: false,
          precio: fromTitle.precio,
          precio_lista: fromTitle.precioLista,
          precio_texto: fromTitle.precioTexto || '',
        };
        // Solo escribe imagen si el scrape trae una; no borra fotos buenas ni pone logo de cadena.
        if (nextImage) $set.imagen = nextImage;
        return {
          updateOne: {
            filter: { slug: `oficial-${key}` },
            update: { $set },
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
        // Solo vincula si el texto de la fuente nombra una sucursal ya conocida. Nunca inventa.
        const saved = await Promocion.find({
          id_empresa: company._id,
          origen: 'oficial',
          slug: { $in: keepSlugs },
          estatus: 'activo',
        })
          .select('_id nombre descripcion politicas')
          .lean();
        for (const promo of saved) {
          const result = await linkOfficialPromoIfSourceNamesBranch(
            promo,
            company._id
          );
          if (result.especificado) linkedFromSource += result.linked;
        }
      } else if (!errors.length) {
        // Fuente respondió pero sin ofertas legibles: caducar basura previa
        await Promocion.updateMany(
          { id_empresa: company._id, origen: 'oficial', estatus: 'activo' },
          { $set: { estatus: 'caduco' } }
        );
      }

      let imagesBackfilled = 0;
      try {
        imagesBackfilled = await backfillMissingProductImages(company._id, 24);
      } catch {
        imagesBackfilled = 0;
      }

      const report = {
        empresa: company.nombre,
        ok: errors.length < urls.length,
        count: operations.length,
        ...(linkedFromSource
          ? { sucursalesVinculadasPorFuente: linkedFromSource }
          : {}),
        ...(imagesBackfilled
          ? { imagenesRellenadas: imagesBackfilled }
          : {}),
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
