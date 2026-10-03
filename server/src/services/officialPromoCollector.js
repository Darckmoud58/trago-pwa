import crypto from 'node:crypto';
import Promocion from '../models/Promocion.js';

const UA = 'Mozilla/5.0 (compatible; TraGoPromoCollector/1.0; +https://trago.app)';
const SOURCE_CONFIG = {
  oxxo: ['https://www.oxxo.com/promociones', 'https://www.oxxo.com/promociones/bebidas', 'https://www.oxxo.com/promociones/cerveza-vinos-y-licores'],
  'la-europea': ['https://www.laeuropea.com.mx/promociones.html'],
  italiannis: ['https://www.italiannis.com.mx/wp-json/wp/v2/posts?per_page=12'],
  vips: ['https://www.vips.com.mx/promociones'],
  starbucks: ['https://www.starbucks.com.mx/rewards'],
  'karne-garibaldi': ['https://www.karnegaribaldi.com.mx/'],
};
const lastCheckedByCompany = new Map();
const SOURCE_TTL_MS = 6 * 60 * 60 * 1000;
export const hasOfficialPromoSource = (slug) => Boolean(SOURCE_CONFIG[slug]?.length);
const MONTHS = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };

function clean(s = '') {
  return String(s).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
function slug(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48); }
function dates(text) {
  const m = text.match(/(?:del?\s+)?(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+(?:de|del)\s+(\d{4}))?\s+(?:al|a)\s+(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+(?:de|del)\s+(\d{4}))?/i);
  if (!m) return { start: null, end: null };
  const sm = MONTHS[m[2].toLowerCase()], em = MONTHS[m[5].toLowerCase()];
  if (sm == null || em == null) return { start: null, end: null };
  const year = new Date().getFullYear();
  const sy = Number(m[3] || m[6] || year), ey = Number(m[6] || m[3] || year);
  return { start: new Date(sy, sm, Number(m[1])), end: new Date(ey, em, Number(m[4]), 23, 59, 59) };
}
function classify(text) {
  const t = text.toLowerCase();
  return { alcohol: /cerveza|vino|licor|mezcal|tequila|whisky|alcohol|chela/.test(t), nocturno: /noche|happy hour|barra|shot/.test(t) };
}
function parsePage(body, url, company) {
  const found = [];
  if (url.includes('wp-json')) {
    let posts = []; try { posts = JSON.parse(body); } catch { return found; }
    for (const post of posts) {
      const title = clean(post.title?.rendered || ''), desc = clean(post.excerpt?.rendered || '');
      if (title.length < 4 || !/promo|2x1|descuento|oferta|combo|happy|regalo|beneficio/i.test(`${title} ${desc}`)) continue;
      found.push({ title, description: desc.slice(0, 500), sourceUrl: post.link || url, evidence: `${title} ${desc}` });
    }
    return found;
  }
  // OXXO's promotion cards expose title and terms through this page callback.
  for (const m of body.matchAll(/open_promo_image\('([^']+)','([^']*)','([^']*)','([^']*)','([^']*)'/g)) {
    const title = clean(m[2]), category = clean(m[3]), terms = clean(m[5]);
    if (title.length >= 4) found.push({ title, description: `${category}${terms ? ` · ${terms}` : ''}`.slice(0, 500), sourceUrl: url, image: m[1].startsWith('//') ? `https:${m[1]}` : m[1], evidence: `${title} ${category} ${terms}` });
  }
  // Generic official pages: keep headings only when promotional wording is present.
  for (const m of body.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>(?:\s*<(?:p|div)[^>]*>([\s\S]*?)<\/(?:p|div)>)?/gi)) {
    const title = clean(m[1]), desc = clean(m[2] || '');
    if (title.length < 5 || title.length > 120 || !/promo|2x1|3x2|descuento|oferta|combo|happy hour|regalo|beneficio|gratis/i.test(`${title} ${desc}`)) continue;
    found.push({ title, description: desc.slice(0, 500), sourceUrl: url, evidence: `${title} ${desc}` });
  }
  const seen = new Set();
  return found.filter((x) => { const k = slug(x.title); if (!k || seen.has(k)) return false; seen.add(k); return true; }).slice(0, 25);
}

async function fetchPage(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/json;q=0.9,*/*;q=0.8' }, signal: AbortSignal.timeout(3500), redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

/** Importa promociones oficiales con solicitudes concurrentes para no bloquear la función serverless. */
export async function collectNearbyPromos(companies) {
  return Promise.all(companies.map(async (company) => {
    const companyId = String(company._id);
    const cached = lastCheckedByCompany.get(companyId);
    if (cached && Date.now() - cached.at < SOURCE_TTL_MS) return cached.report;

    const urls = SOURCE_CONFIG[company.slug];
    if (!urls?.length) {
      const report = { empresa: company.nombre, ok: false, count: 0, reason: 'sin fuente compatible configurada' };
      lastCheckedByCompany.set(companyId, { at: Date.now(), report });
      return report;
    }

    const results = await Promise.all(urls.map(async (url) => {
      try {
        const body = await fetchPage(url);
        return { url, hits: parsePage(body, url, company), error: null };
      } catch (error) {
        return { url, hits: [], error: `${url}: ${error.message}` };
      }
    }));
    const errors = results.flatMap((result) => result.error ? [result.error] : []);
    const uniqueHits = new Map();
    for (const result of results) {
      for (const hit of result.hits) {
        const key = slug(hit.title);
        if (key) uniqueHits.set(key, hit);
      }
    }

    const now = new Date();
    const operations = [...uniqueHits.values()].map((hit) => {
      const key = crypto.createHash('sha1').update(`${companyId}:${slug(hit.title)}`).digest('hex').slice(0, 16);
      const { start, end } = dates(hit.evidence);
      const flags = classify(hit.evidence);
      return {
        updateOne: {
          filter: { slug: `oficial-${key}` },
          update: { $set: {
            slug: `oficial-${key}`,
            id_empresa: company._id,
            nombre: hit.title,
            descripcion: hit.description || `Promoción publicada por ${company.nombre}.`,
            politicas: `Fuente oficial consultada automáticamente. ${start && end ? 'Vigencia extraída del texto publicado.' : 'La página no indicó fechas legibles; confirma vigencia y condiciones con la empresa.'}`,
            imagen: hit.image || company.imagen || '',
            origen: 'oficial', url_fuente: hit.sourceUrl,
            inicia_en: start, termina_en: end,
            alcohol: flags.alcohol, audiencia: flags.alcohol ? 'adulto' : 'todos', nocturno: flags.nocturno,
            estatus: end && end < now ? 'caduco' : 'activo', destacada: false,
          } },
          upsert: true,
        },
      };
    });
    if (operations.length) await Promocion.bulkWrite(operations, { ordered: false });

    const report = { empresa: company.nombre, ok: errors.length < urls.length, count: operations.length, ...(errors.length ? { errors } : {}) };
    lastCheckedByCompany.set(companyId, { at: Date.now(), report });
    return report;
  }));
}
