/**
 * Beneficios de cumpleaños publicados en sitios oficiales / legales de lealtad.
 * No inventa: solo upserta si la página responde y contiene evidencia legible.
 */
import crypto from 'node:crypto';
import Empresa from '../models/Empresa.js';
import Promocion from '../models/Promocion.js';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 TraGoBirthdayCollector/1.0';

/**
 * Fuentes públicas verificables (ToS / FAQ / rewards).
 * `mustMatch`: todas deben aparecer (case-insensitive) en el HTML/texto.
 */
export const BIRTHDAY_OFFICIAL_SOURCES = [
  {
    brandSlug: 'starbucks',
    brandName: 'Starbucks',
    sitio_web: 'https://rewards.starbucks.mx/',
    sourceUrl: 'https://mx-prod-sbx-rewards-pre.azurewebsites.net/tos/rewards',
    mustMatch: ['bebida', 'cumpleaños'],
    title: 'Bebida de cumpleaños · Starbucks Rewards',
    description:
      'Miembros Starbucks Rewards: bebida de cortesía durante el mes de tu cumpleaños (barra espresso). Requiere fecha registrada, ID oficial y compra mínima previa según términos.',
    politicas:
      'Fuente: Términos Starbucks Rewards MX. Confirma en app/tienda. TraGo no canjea el beneficio; solo informa lo publicado.',
  },
  {
    brandSlug: 'krispy-kreme',
    brandName: 'Krispy Kreme',
    sitio_web: 'https://www.krispykreme.mx/rewards/',
    sourceUrl: 'https://www.krispykreme.mx/rewards/',
    mustMatch: ['cumpleaños', 'media docena'],
    title: 'Media docena glaseada · cumpleaños Krispy Kreme Rewards',
    description:
      'Krispy Kreme Rewards: el día exacto de tu cumpleaños habilita media docena Glaseada Original. Debes estar registrado; si te registras ese día, espera ~30 min en la app. ID oficial al canjear.',
    politicas:
      'Fuente: krispykreme.mx/rewards. Confirma en app/tienda. TraGo solo informa el beneficio publicado.',
  },
  {
    brandSlug: 'nutrisa',
    brandName: 'Nutrisa',
    sitio_web: 'https://www.nutrisa.com/',
    sourceUrl: 'https://legalesapp.nutrisa.com/index-esp.html',
    mustMatch: ['helado', 'cumpleaños'],
    title: 'Helado suave de cumpleaños · App Nutrisa',
    description:
      'App Nutrisa: helado suave sencillo (natural o temporada) durante el mes de cumpleaños registrado. Requiere ID oficial y ticket mínimo reciente según términos legales de la app.',
    politicas:
      'Fuente: legalesapp.nutrisa.com. Confirma en app/tienda. TraGo solo informa el beneficio publicado.',
  },
  {
    brandSlug: 'italiannis',
    brandName: "Italianni's",
    sitio_web: 'https://www.italiannis.com.mx/',
    sourceUrl:
      'https://mx-ita-prod-web-cdcpc3ckfpbqd6d8.eastus2-01.azurewebsites.net/preguntas-frecuentes-italiannis/',
    mustMatch: ['cumpleaños', 'budín'],
    title: "Budín de cortesía · cumpleaños Italianni's",
    description:
      "Italianni's: budín de cortesía al presentar ID oficial durante el mes de tu cumpleaños. Socios WOW Rewards pueden tener descuento adicional publicado en FAQ.",
    politicas:
      "Fuente: FAQ oficial Italianni's. Confirma en restaurante/app. TraGo solo informa el beneficio publicado.",
  },
];

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return stripHtml(await res.text());
}

function evidenceOk(text, mustMatch) {
  const hay = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return mustMatch.every((needle) => {
    const n = needle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return hay.includes(n);
  });
}

async function ensureBrandCompany(source) {
  return Empresa.findOneAndUpdate(
    { slug: source.brandSlug },
    {
      $set: {
        nombre: source.brandName,
        slug: source.brandSlug,
        estatus: 'activo',
        sitio_web: source.sitio_web,
      },
      $setOnInsert: {
        descripcion: `Cadena con beneficio de cumpleaños publicado (${source.brandName}).`,
        imagen: '',
        verificada: false,
      },
    },
    { upsert: true, new: true }
  ).lean();
}

function birthdaySlug(brandSlug, title) {
  const key = crypto
    .createHash('sha1')
    .update(`bday:${brandSlug}:${title}`)
    .digest('hex')
    .slice(0, 16);
  return `oficial-bday-${key}`;
}

/**
 * Consulta fuentes oficiales de cumple y upserta promos origen:oficial + cumpleanos.
 * @returns {Promise<{ ok: boolean, upserted: number, skipped: number, errors: string[], reports: object[] }>}
 */
export async function refreshOfficialBirthdayBenefits() {
  const reports = [];
  let upserted = 0;
  let skipped = 0;
  const errors = [];
  const keepSlugs = [];

  for (const source of BIRTHDAY_OFFICIAL_SOURCES) {
    try {
      const text = await fetchText(source.sourceUrl);
      if (!evidenceOk(text, source.mustMatch)) {
        skipped += 1;
        reports.push({
          marca: source.brandName,
          ok: false,
          reason: 'página sin evidencia legible de beneficio de cumple',
          url: source.sourceUrl,
        });
        continue;
      }
      const company = await ensureBrandCompany(source);
      const slug = birthdaySlug(source.brandSlug, source.title);
      keepSlugs.push(slug);
      await Promocion.findOneAndUpdate(
        { slug },
        {
          $set: {
            slug,
            id_empresa: company._id,
            nombre: source.title,
            descripcion: source.description,
            politicas: source.politicas,
            origen: 'oficial',
            url_fuente: source.sourceUrl,
            cumpleanos: true,
            alcohol: false,
            nocturno: false,
            audiencia: 'todos',
            destacada: true,
            estatus: 'activo',
            inicia_en: null,
            termina_en: null,
            precio: 0,
            precio_lista: null,
            precio_texto: 'Cortesía / lealtad',
          },
        },
        { upsert: true, new: true }
      );
      upserted += 1;
      reports.push({
        marca: source.brandName,
        ok: true,
        slug,
        url: source.sourceUrl,
      });
    } catch (err) {
      skipped += 1;
      const msg = `${source.brandName}: ${err.message}`;
      errors.push(msg);
      reports.push({
        marca: source.brandName,
        ok: false,
        reason: err.message,
        url: source.sourceUrl,
      });
    }
  }

  // Caducar solo beneficios de cumple oficiales que ya no pasaron evidencia.
  if (keepSlugs.length) {
    await Promocion.updateMany(
      {
        origen: 'oficial',
        cumpleanos: true,
        estatus: 'activo',
        slug: { $regex: /^oficial-bday-/, $nin: keepSlugs },
      },
      { $set: { estatus: 'caduco' } }
    );
  }

  // El demo de seed no debe competir con fuentes oficiales.
  await Promocion.updateMany(
    { origen: 'demo', cumpleanos: true, estatus: 'activo' },
    { $set: { estatus: 'caduco' } }
  );

  return {
    ok: upserted > 0,
    upserted,
    skipped,
    errors,
    reports,
  };
}
