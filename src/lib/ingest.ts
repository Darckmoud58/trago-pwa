import type { PromoKind } from "./types";
import { collections } from "./queries";

export type SourceHit = {
  title: string;
  subtitle: string;
  terms: string;
  imageUrl: string;
  sourceUrl: string;
  kind: PromoKind;
  alcohol: boolean;
  isNocturno: boolean;
  isBirthday: boolean;
  startsAt: Date;
  endsAt: Date;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 TraGo/0.1";

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const SOURCES: { chainSlug: string; urls: string[]; limit: number }[] = [
  {
    chainSlug: "oxxo",
    urls: [
      "https://www.oxxo.com/promociones",
      "https://www.oxxo.com/promociones/bebidas",
      "https://www.oxxo.com/promociones/cerveza-vinos-y-licores",
    ],
    limit: 18,
  },
  {
    chainSlug: "italiannis",
    urls: ["https://www.italiannis.com.mx/wp-json/wp/v2/posts?per_page=12"],
    limit: 8,
  },
  {
    chainSlug: "la-europea",
    urls: ["https://www.laeuropea.com.mx/promociones.html"],
    limit: 8,
  },
  {
    chainSlug: "vips",
    urls: ["https://www.vips.com.mx/", "https://www.vips.com.mx/promociones"],
    limit: 6,
  },
  {
    chainSlug: "starbucks",
    urls: ["https://www.starbucks.com.mx/", "https://www.starbucks.com.mx/rewards"],
    limit: 6,
  },
  {
    chainSlug: "karne-garibaldi",
    urls: ["https://www.karnegaribaldi.com.mx/"],
    limit: 6,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html: string) {
  return decode(html.replace(/<[^>]+>/g, " "));
}

function classify(text: string, category = ""): Pick<SourceHit, "kind" | "alcohol" | "isNocturno" | "isBirthday"> {
  const hay = `${text} ${category}`.toLowerCase();
  const alcohol = /cerveza|vino|licor|mezcal|tequila|whisky|destil|alcohol|chela/.test(hay);
  const isBirthday = /cumple|birthday|naci/.test(hay);
  const isNocturno = alcohol || /noche|happy hour|barra|shot/.test(hay);
  let kind: PromoKind = "descuento";
  if (isBirthday) kind = "cumple";
  else if (/2\s*x\s*1|2x1/.test(hay)) kind = "2x1";
  else if (/3\s*x\s*2|3x2/.test(hay)) kind = "botella";
  else if (alcohol && /botella|750|vino|mezcal/.test(hay)) kind = "botella";
  else if (/desayuno|pasta|birria|comida|pizza|ensalada|hotcake/.test(hay)) kind = "comida";
  else if (/happy/.test(hay)) kind = "happy-hour";
  else if (/combo/.test(hay)) kind = "combo";
  return { kind, alcohol, isNocturno, isBirthday };
}

function parseVigencia(text: string): { startsAt: Date; endsAt: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const m = text.match(
    /del\s+(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de(?:l)?\s+(\d{4})\s+)?al\s+(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+del?\s+(\d{4}))?/i,
  );
  if (!m) {
    return {
      startsAt: new Date(year, now.getMonth(), 1),
      endsAt: new Date(year, 11, 31, 23, 59, 59),
    };
  }
  const startMonth = MONTHS[m[2].toLowerCase()] ?? now.getMonth() + 1;
  const endMonth = MONTHS[m[5].toLowerCase()] ?? startMonth;
  const startYear = Number(m[3] || m[6] || year);
  const endYear = Number(m[6] || m[3] || year);
  return {
    startsAt: new Date(startYear, startMonth - 1, Number(m[1])),
    endsAt: new Date(endYear, endMonth - 1, Number(m[4]), 23, 59, 59),
  };
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/json;q=0.9,*/*;q=0.8" },
    signal: AbortSignal.timeout(12000),
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function parseOxxo(html: string, pageUrl: string): SourceHit[] {
  const re =
    /open_promo_image\('([^']+)','([^']*)','([^']*)','([^']*)','([^']*)'/g;
  const hits: SourceHit[] = [];
  for (const m of html.matchAll(re)) {
    const imageUrl = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
    const title = decode(m[2]);
    const category = decode(m[3]);
    const terms = decode(m[5]);
    if (!title || title.length < 4) continue;
    const dates = parseVigencia(terms);
    hits.push({
      title,
      subtitle: `${category} · OXXO`,
      terms: `${terms} Fuente: oxxo.com/promociones. Vigencia y precio se confirman en sucursal.`,
      imageUrl,
      sourceUrl: pageUrl,
      ...classify(`${title} ${category} ${terms}`, category),
      ...dates,
    });
  }
  return hits;
}

function parseWordpressPosts(json: string): SourceHit[] {
  const posts = JSON.parse(json) as {
    title?: { rendered?: string };
    excerpt?: { rendered?: string };
    link?: string;
    slug?: string;
  }[];
  if (!Array.isArray(posts)) return [];
  return posts
    .map((post) => {
      const title = stripTags(post.title?.rendered ?? "");
      const excerpt = stripTags(post.excerpt?.rendered ?? "");
      if (!title || /concurso/i.test(title)) return null;
      const dates = parseVigencia(excerpt);
      return {
        title,
        subtitle: excerpt.slice(0, 120) || "Publicado en italiannis.com.mx",
        terms: `${excerpt} Fuente: página oficial de Italianni's.`,
        imageUrl:
          "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=900&h=600&fit=crop",
        sourceUrl: post.link || "https://www.italiannis.com.mx/promociones/",
        ...classify(`${title} ${excerpt}`),
        ...dates,
      } satisfies SourceHit;
    })
    .filter((row): row is SourceHit => row !== null);
}

function parseMagentoProducts(html: string, pageUrl: string): SourceHit[] {
  const re =
    /<a[^>]+class="[^"]*product-item-link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const hits: SourceHit[] = [];
  for (const m of html.matchAll(re)) {
    const title = stripTags(m[2]);
    if (title.length < 8 || title.length > 90) continue;
    hits.push({
      title,
      subtitle: "Oferta en laeuropea.com.mx",
      terms: "Leído de la página oficial de La Europea. Precio y existencias se confirman en sucursal o en línea.",
      imageUrl:
        "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=900&h=600&fit=crop",
      sourceUrl: m[1] || pageUrl,
      ...classify(title),
      startsAt: new Date(),
      endsAt: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59),
    });
  }
  return hits;
}

function parseGenericHeadings(html: string, pageUrl: string, brand: string): SourceHit[] {
  const re = /<h[23][^>]*>([\s\S]*?)<\/h[23]>\s*(?:<p[^>]*>([\s\S]*?)<\/p>)?/gi;
  const hits: SourceHit[] = [];
  for (const m of html.matchAll(re)) {
    const title = stripTags(m[1]);
    const subtitle = stripTags(m[2] ?? "");
    if (title.length < 8 || title.length > 80) continue;
    if (!/promo|2x1|descuento|oferta|combo|cumple|vigencia|regalo|desayuno/i.test(`${title} ${subtitle}`)) {
      continue;
    }
    if (/cookie|aviso|privacidad|menú|menu|ubicación/i.test(title)) continue;
    hits.push({
      title,
      subtitle: subtitle.slice(0, 140) || `Publicado en ${brand}`,
      terms: `${subtitle} Fuente: ${pageUrl}`,
      imageUrl:
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&h=600&fit=crop",
      sourceUrl: pageUrl,
      ...classify(`${title} ${subtitle}`),
      startsAt: new Date(),
      endsAt: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59),
    });
  }
  return hits;
}

function dedupe(hits: SourceHit[]) {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = slugify(hit.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function ingestChain(chainSlug: string, urls: string[], limit: number) {
  const collected: SourceHit[] = [];
  for (const url of urls) {
    const body = await fetchText(url);
    if (url.includes("wp-json")) collected.push(...parseWordpressPosts(body));
    else if (url.includes("oxxo.com")) collected.push(...parseOxxo(body, url));
    else if (url.includes("laeuropea.com")) collected.push(...parseMagentoProducts(body, url));
    else collected.push(...parseGenericHeadings(body, url, chainSlug));
  }
  return dedupe(collected).slice(0, limit);
}

export async function refreshOfficialSources(opts?: { ifStaleHours?: number; force?: boolean }) {
  const col = await collections();
  const staleHours = opts?.ifStaleHours ?? 6;
  if (!opts?.force) {
    const prev = await col.meta.findOne({ _id: "official-sync" });
    if (prev?.at && Date.now() - new Date(prev.at).getTime() < staleHours * 3600_000) {
      return prev;
    }
  }

  const chains = await col.chains.find().toArray();
  const bySlug = new Map(chains.map((c) => [c.slug, c]));
  const report: Record<string, { ok: boolean; count: number; error?: string }> = {};
  const imported: {
    promo: {
      _id: string;
      slug: string;
      chainId: string;
      chainName: string;
      title: string;
      subtitle: string;
      kind: PromoKind;
      isNocturno: boolean;
      alcohol: boolean;
      isBirthday: boolean;
      startsAt: Date;
      endsAt: Date;
      terms: string;
      imageUrl: string;
      featured: boolean;
      isDemo: false;
      sourceUrl: string;
      sourceLabel: string;
    };
    chainId: string;
  }[] = [];

  for (const source of SOURCES) {
    const chain = bySlug.get(source.chainSlug);
    if (!chain) continue;
    try {
      const hits = await ingestChain(source.chainSlug, source.urls, source.limit);
      report[source.chainSlug] = { ok: true, count: hits.length };
      hits.forEach((hit, i) => {
        const slug = `oficial-${source.chainSlug}-${slugify(hit.title) || i}`;
        imported.push({
          chainId: chain._id,
          promo: {
            _id: `imp-${chain._id}-${slugify(hit.title) || i}`,
            slug,
            chainId: chain._id,
            chainName: chain.name,
            title: hit.title,
            subtitle: hit.subtitle,
            kind: hit.kind,
            isNocturno: hit.isNocturno,
            alcohol: hit.alcohol,
            isBirthday: hit.isBirthday,
            startsAt: hit.startsAt,
            endsAt: hit.endsAt,
            terms: hit.terms,
            imageUrl: hit.imageUrl,
            featured: i < 3,
            isDemo: false,
            sourceUrl: hit.sourceUrl,
            sourceLabel: `Página oficial · ${chain.name}`,
          },
        });
      });
    } catch (err) {
      report[source.chainSlug] = {
        ok: false,
        count: 0,
        error: err instanceof Error ? err.message : "falló",
      };
    }
  }

  const old = await col.promos.find({ _id: { $regex: "^imp-" } }).project({ _id: 1 }).toArray();
  const oldIds = old.map((d) => d._id);
  if (oldIds.length) {
    await col.promos.deleteMany({ _id: { $in: oldIds } });
    await col.branchPromos.deleteMany({ promoId: { $in: oldIds } });
  }

  if (imported.length) {
    await col.promos.insertMany(imported.map((row) => row.promo));
    const branches = await col.branches.find().toArray();
    const links = imported.flatMap(({ promo, chainId }) =>
      branches
        .filter((b) => b.chainId === chainId)
        .map((b) => ({
          promoId: promo._id,
          branchId: b._id,
          officialActive: true,
          reportsVigente: 0,
          reportsCaduco: 0,
        })),
    );
    if (links.length) await col.branchPromos.insertMany(links);
  }

  await col.meta.updateOne(
    { _id: "official-sync" },
    { $set: { at: new Date(), sources: report } },
    { upsert: true },
  );
  return { at: new Date(), sources: report };
}

export async function getOfficialSyncMeta() {
  const col = await collections();
  return col.meta.findOne({ _id: "official-sync" });
}
