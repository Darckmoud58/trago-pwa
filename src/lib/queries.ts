import { cache } from "react";
import { after } from "next/server";
import type { OptionalId } from "mongodb";
import { catalogFrom, nearbyPromos } from "./catalog";
import {
  branchFromDoc,
  chainFromDoc,
  linkFromDoc,
  promoFromDoc,
  type BranchDoc,
  type BranchPromoDoc,
  type ChainDoc,
  type CouponDoc,
  type PromoDoc,
  type PushSubDoc,
  type ReportDoc,
  type ReviewDoc,
  type UserDoc,
} from "./docs";
import { getMongo, hasMongoUri } from "./mongo";
import { CATALOG_VERSION, branchPromos, branches, chains, promos } from "./mock-data";
import {
  VoteError,
  isNearBranch,
  presenceMaxKm,
  voteCutoff,
  VOTES_PER_HOUR,
} from "./presence";
import {
  COUPON_COST,
  COUPON_LABEL,
  POINTS_REVIEW_NEAR,
  POINTS_REVIEW_REMOTE,
  POINTS_VOTE,
  couponCode,
} from "./rewards";
import type { Catalog, GeoPoint, PromoKind, SessionUser } from "./types";

async function collections() {
  const db = await getMongo();
  return {
    users: db.collection<UserDoc>("users"),
    chains: db.collection<ChainDoc>("chains"),
    branches: db.collection<BranchDoc>("branches"),
    promos: db.collection<PromoDoc>("promos"),
    branchPromos: db.collection<BranchPromoDoc>("branchPromos"),
    reports: db.collection<ReportDoc>("reports"),
    reviews: db.collection<ReviewDoc>("reviews"),
    coupons: db.collection<CouponDoc>("coupons"),
    pushSubs: db.collection<PushSubDoc>("pushSubs"),
    meta: db.collection<{
      _id: string;
      version?: number;
      at?: Date;
      sources?: Record<string, { ok: boolean; count: number; error?: string }>;
    }>("meta"),
  };
}

let seeded = false;

export async function ensureIndexesAndSeed() {
  const col = await collections();
  await col.users.createIndex({ email: 1 }, { unique: true });
  await col.users.createIndex({ googleId: 1 }, { unique: true, sparse: true });
  await col.chains.createIndex({ slug: 1 }, { unique: true });
  await col.branches.createIndex({ slug: 1 }, { unique: true });
  await col.branches.createIndex({ chainId: 1 });
  await col.branches.createIndex({ location: "2dsphere" });
  await col.promos.createIndex({ slug: 1 }, { unique: true });
  await col.promos.createIndex({ chainId: 1 });
  await col.branchPromos.createIndex({ promoId: 1, branchId: 1 }, { unique: true });
  await col.reports.createIndex({ userId: 1, promoId: 1, branchId: 1 }, { unique: true });
  await col.reports.createIndex({ userId: 1, updatedAt: -1 });
  await col.reports.createIndex({ promoId: 1, branchId: 1, updatedAt: -1 });
  await col.pushSubs.createIndex({ endpoint: 1 }, { unique: true });
  await col.pushSubs.createIndex({ userId: 1 });
  await col.reviews.createIndex({ promoId: 1, createdAt: -1 });
  await col.reviews.createIndex({ userId: 1, promoId: 1, branchId: 1 });
  await col.coupons.createIndex({ userId: 1, createdAt: -1 });
  await col.coupons.createIndex({ code: 1 }, { unique: true });
  await col.chains.createIndex({ ownerUserId: 1 }, { sparse: true });

  if (seeded) return;
  const meta = await col.meta.findOne({ _id: "catalog" });
  const staleCity = await col.branches.findOne({ city: "CDMX" });
  if (staleCity || !meta || meta.version !== CATALOG_VERSION) {
    await col.chains.deleteMany({
      $or: [{ ownerUserId: { $exists: false } }, { ownerUserId: null as unknown as string }],
    });
    await col.branches.deleteMany({});
    await col.promos.deleteMany({
      $or: [{ origin: { $ne: "chain" } }, { origin: { $exists: false } }],
    });
    await col.branchPromos.deleteMany({});
  } else if ((await col.chains.countDocuments()) > 0) {
    seeded = true;
    return;
  }

  const chainById = new Map(chains.map((c) => [c.id, c]));
  await col.chains.insertMany(
    chains.map(({ id, ...c }) => ({
      _id: id,
      ...c,
    })),
  );
  await col.branches.insertMany(
    branches.map((b) => ({
      _id: b.id,
      slug: b.slug,
      chainId: b.chainId,
      chainName: chainById.get(b.chainId)?.name ?? "",
      name: b.name,
      kind: b.kind,
      address: b.address,
      colonia: b.colonia,
      city: b.city,
      location: { type: "Point" as const, coordinates: [b.geo.lng, b.geo.lat] as [number, number] },
      hours: b.hours,
      imageUrl: b.imageUrl,
    })),
  );
  await col.promos.insertMany(
    promos.map((p) => ({
      _id: p.id,
      slug: p.slug,
      chainId: p.chainId,
      chainName: chainById.get(p.chainId)?.name ?? "",
      title: p.title,
      subtitle: p.subtitle,
      kind: p.kind,
      isNocturno: p.isNocturno,
      alcohol: p.alcohol,
      isBirthday: p.isBirthday,
      startsAt: new Date(p.startsAt),
      endsAt: new Date(p.endsAt),
      terms: p.terms,
      imageUrl: p.imageUrl,
      featured: p.featured,
      isDemo: p.isDemo,
    })),
  );
  await col.branchPromos.insertMany(branchPromos.map((l) => ({ ...l })));
  await col.meta.updateOne(
    { _id: "catalog" },
    { $set: { version: CATALOG_VERSION } },
    { upsert: true },
  );
  seeded = true;
}

export function seedCatalog(): Catalog {
  return catalogFrom(chains, branches, promos, branchPromos);
}

export const getCatalog = cache(async (): Promise<Catalog> => {
  if (!hasMongoUri()) return seedCatalog();
  try {
    await ensureIndexesAndSeed();
    after(async () => {
      const { refreshOfficialSources } = await import("./ingest");
      await refreshOfficialSources({ ifStaleHours: 6 }).catch(() => {});
    });
    const col = await collections();
    const [c, b, p, l] = await Promise.all([
      col.chains.find().toArray(),
      col.branches.find().toArray(),
      col.promos.find().toArray(),
      col.branchPromos.find().toArray(),
    ]);
    const links = await overlayRecentVotes(l);
    return catalogFrom(
      c.map(chainFromDoc),
      b.map(branchFromDoc),
      p.map(promoFromDoc),
      links,
    );
  } catch {
    return seedCatalog();
  }
});

export async function findUserByEmail(email: string) {
  const col = await collections();
  return col.users.findOne({ email: email.toLowerCase().trim() });
}

export async function findUserByGoogleId(googleId: string) {
  const col = await collections();
  return col.users.findOne({ googleId });
}

export async function linkGoogleAccount(
  userId: string,
  googleId: string,
  picture?: string,
) {
  const col = await collections();
  const { ObjectId } = await import("mongodb");
  if (!ObjectId.isValid(userId)) return;
  await col.users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        googleId,
        ...(picture ? { "profile.picture": picture } : {}),
      },
    },
  );
}

export async function insertUser(doc: OptionalId<UserDoc>) {
  const col = await collections();
  const result = await col.users.insertOne(doc);
  return result.insertedId;
}

export async function findUserById(id: string) {
  const col = await collections();
  const { ObjectId } = await import("mongodb");
  if (!ObjectId.isValid(id)) return null;
  return col.users.findOne({ _id: new ObjectId(id) });
}

async function overlayRecentVotes(docs: BranchPromoDoc[]) {
  const col = await collections();
  const cutoff = voteCutoff();
  const rows = await col.reports
    .aggregate<{
      _id: { promoId: string; branchId: string };
      yes: number;
      no: number;
    }>([
      { $match: { updatedAt: { $gte: cutoff } } },
      {
        $group: {
          _id: { promoId: "$promoId", branchId: "$branchId" },
          yes: { $sum: { $cond: ["$stillValid", 1, 0] } },
          no: { $sum: { $cond: ["$stillValid", 0, 1] } },
        },
      },
    ])
    .toArray();
  const live = new Map(rows.map((r) => [`${r._id.promoId}:${r._id.branchId}`, r]));
  return docs.map((d) => {
    const hit = live.get(`${d.promoId}:${d.branchId}`);
    const base = linkFromDoc(d);
    if (!hit) return base;
    return { ...base, reportsVigente: hit.yes, reportsCaduco: hit.no };
  });
}

async function recountLinkVotes(promoId: string, branchId: string) {
  const col = await collections();
  const cutoff = voteCutoff();
  const [yes, no] = await Promise.all([
    col.reports.countDocuments({
      promoId,
      branchId,
      stillValid: true,
      updatedAt: { $gte: cutoff },
    }),
    col.reports.countDocuments({
      promoId,
      branchId,
      stillValid: false,
      updatedAt: { $gte: cutoff },
    }),
  ]);
  await col.branchPromos.updateOne(
    { promoId, branchId },
    { $set: { reportsVigente: yes, reportsCaduco: no } },
  );
  return col.branchPromos.findOne({ promoId, branchId });
}

export async function getUserVote(userId: string, promoId: string, branchId: string) {
  const col = await collections();
  return col.reports.findOne({ userId, promoId, branchId });
}

export async function setOfficialActive(opts: {
  promoId: string;
  branchId: string;
  officialActive: boolean;
}) {
  await ensureIndexesAndSeed();
  const col = await collections();
  await col.branchPromos.updateOne(
    { promoId: opts.promoId, branchId: opts.branchId },
    { $set: { officialActive: opts.officialActive } },
  );
  return col.branchPromos.findOne({ promoId: opts.promoId, branchId: opts.branchId });
}

export async function saveVote(opts: {
  userId: string;
  promoId: string;
  branchId: string;
  stillValid: boolean;
  geo: GeoPoint;
}) {
  if (!hasMongoUri()) {
    throw new VoteError(503, "Los votos necesitan MongoDB. En demo pública solo se ve el catálogo.");
  }
  await ensureIndexesAndSeed();
  const col = await collections();

  const link = await col.branchPromos.findOne({
    promoId: opts.promoId,
    branchId: opts.branchId,
  });
  if (!link?.officialActive) {
    throw new VoteError(400, "Esta sucursal no participa en la promo.");
  }

  const branch = await col.branches.findOne({ _id: opts.branchId });
  if (!branch) throw new VoteError(404, "Sucursal no encontrada.");
  const point = branchFromDoc(branch).geo;
  if (!isNearBranch(opts.geo, point)) {
    const maxM = Math.round(presenceMaxKm() * 1000);
    throw new VoteError(
      403,
      `Hay que estar a menos de ${maxM} m de la sucursal para reportar vigencia.`,
    );
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await col.reports.countDocuments({
    userId: opts.userId,
    updatedAt: { $gte: hourAgo },
  });
  const prev = await col.reports.findOne({
    userId: opts.userId,
    promoId: opts.promoId,
    branchId: opts.branchId,
  });
  const isUpdateSameLink = Boolean(prev);
  if (!isUpdateSameLink && recent >= VOTES_PER_HOUR) {
    throw new VoteError(429, "Demasiados reportes en una hora. Intenta más tarde.");
  }

  const now = new Date();
  await col.reports.updateOne(
    { userId: opts.userId, promoId: opts.promoId, branchId: opts.branchId },
    {
      $set: {
        stillValid: opts.stillValid,
        updatedAt: now,
        lat: opts.geo.lat,
        lng: opts.geo.lng,
      },
      $setOnInsert: {
        userId: opts.userId,
        promoId: opts.promoId,
        branchId: opts.branchId,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  if (!isUpdateSameLink || prev?.stillValid !== opts.stillValid) {
    await addPoints(opts.userId, POINTS_VOTE);
  }

  return recountLinkVotes(opts.promoId, opts.branchId);
}

async function addPoints(userId: string, delta: number) {
  const col = await collections();
  const { ObjectId } = await import("mongodb");
  if (!ObjectId.isValid(userId)) return 0;
  const res = await col.users.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $inc: { points: delta } },
    { returnDocument: "after" },
  );
  return res?.points ?? 0;
}

export async function getUserPoints(userId: string) {
  const user = await findUserById(userId);
  return user?.points ?? 0;
}

export async function listUserCoupons(userId: string) {
  if (!hasMongoUri()) return [];
  const col = await collections();
  return col.coupons.find({ userId }).sort({ createdAt: -1 }).limit(20).toArray();
}

export async function redeemCoupon(userId: string) {
  if (!hasMongoUri()) throw new VoteError(503, "Recompensas necesitan MongoDB.");
  await ensureIndexesAndSeed();
  const col = await collections();
  const { ObjectId } = await import("mongodb");
  if (!ObjectId.isValid(userId)) throw new VoteError(400, "Usuario inválido.");

  const user = await col.users.findOne({ _id: new ObjectId(userId) });
  const points = user?.points ?? 0;
  if (points < COUPON_COST) {
    throw new VoteError(400, `Necesitas ${COUPON_COST} puntos. Tienes ${points}.`);
  }

  const code = couponCode();
  const now = new Date();
  await col.users.updateOne({ _id: new ObjectId(userId) }, { $inc: { points: -COUPON_COST } });
  await col.coupons.insertOne({
    userId,
    code,
    label: COUPON_LABEL,
    costPoints: COUPON_COST,
    createdAt: now,
    redeemedAt: null,
  });
  const fresh = await col.users.findOne({ _id: new ObjectId(userId) });
  return { code, label: COUPON_LABEL, points: fresh?.points ?? points - COUPON_COST };
}

export async function listReviewsForPromo(promoId: string, limit = 12) {
  if (!hasMongoUri()) return [];
  const col = await collections();
  return col.reviews.find({ promoId }).sort({ createdAt: -1 }).limit(limit).toArray();
}

export async function chainReputation(chainId: string) {
  if (!hasMongoUri()) return { avg: null as number | null, count: 0 };
  const col = await collections();
  const promoIds = (await col.promos.find({ chainId }).project({ _id: 1 }).toArray()).map(
    (p) => p._id,
  );
  if (promoIds.length === 0) return { avg: null, count: 0 };
  const rows = await col.reviews
    .aggregate<{ avg: number; count: number }>([
      { $match: { promoId: { $in: promoIds } } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ])
    .toArray();
  const hit = rows[0];
  return hit
    ? { avg: Math.round(hit.avg * 10) / 10, count: hit.count }
    : { avg: null, count: 0 };
}

export async function saveReview(opts: {
  userId: string;
  userName: string;
  promoId: string;
  branchId: string;
  rating: number;
  text: string;
  geo?: GeoPoint | null;
}) {
  if (!hasMongoUri()) throw new VoteError(503, "Las opiniones necesitan MongoDB.");
  await ensureIndexesAndSeed();
  const col = await collections();

  const link = await col.branchPromos.findOne({
    promoId: opts.promoId,
    branchId: opts.branchId,
  });
  if (!link) throw new VoteError(404, "Esa promo no está ligada a la sucursal.");

  const branch = await col.branches.findOne({ _id: opts.branchId });
  if (!branch) throw new VoteError(404, "Sucursal no encontrada.");
  const point = branchFromDoc(branch).geo;
  const nearStore = opts.geo ? isNearBranch(opts.geo, point) : false;

  const recent = await col.reviews.findOne({
    userId: opts.userId,
    promoId: opts.promoId,
    branchId: opts.branchId,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
  if (recent) throw new VoteError(429, "Ya opinaste aquí hoy. Vuelve mañana.");

  const now = new Date();
  await col.reviews.insertOne({
    userId: opts.userId,
    userName: opts.userName,
    promoId: opts.promoId,
    branchId: opts.branchId,
    rating: opts.rating,
    text: opts.text.slice(0, 500),
    nearStore,
    createdAt: now,
    ...(opts.geo ? { lat: opts.geo.lat, lng: opts.geo.lng } : {}),
  });

  const pts = nearStore ? POINTS_REVIEW_NEAR : POINTS_REVIEW_REMOTE;
  const points = await addPoints(opts.userId, pts);
  return { nearStore, pointsAwarded: pts, points };
}

export async function userOwnsChain(userId: string) {
  if (!hasMongoUri()) return false;
  const col = await collections();
  return Boolean(await col.chains.findOne({ ownerUserId: userId }));
}

export async function chainsOwnedBy(userId: string) {
  if (!hasMongoUri()) return [];
  const col = await collections();
  return col.chains.find({ ownerUserId: userId }).toArray();
}

export async function registerChain(opts: {
  user: SessionUser;
  name: string;
  slug: string;
  website: string;
  tagline: string;
  description: string;
}) {
  if (!hasMongoUri()) throw new VoteError(503, "Registro de empresa necesita MongoDB.");
  await ensureIndexesAndSeed();
  const col = await collections();
  const slug = opts.slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length < 2) throw new VoteError(400, "Slug inválido.");

  const exists = await col.chains.findOne({ slug });
  if (exists?.ownerUserId && exists.ownerUserId !== opts.user.id) {
    throw new VoteError(409, "Esa cadena ya tiene dueño en TraGo.");
  }
  if (exists && !exists.ownerUserId) {
    await col.chains.updateOne(
      { _id: exists._id },
      {
        $set: {
          ownerUserId: opts.user.id,
          publishesPromos: true,
          website: opts.website || exists.website,
          tagline: opts.tagline || exists.tagline,
          description: opts.description || exists.description,
        },
      },
    );
    const { ObjectId } = await import("mongodb");
    if (ObjectId.isValid(opts.user.id)) {
      await col.users.updateOne({ _id: new ObjectId(opts.user.id) }, { $set: { role: "chain" } });
    }
    return chainFromDoc({ ...exists, ownerUserId: opts.user.id, publishesPromos: true });
  }
  if (exists) {
    throw new VoteError(409, "Ese slug ya está en uso.");
  }

  const id = `c-user-${slug}`;
  const mark = opts.name.slice(0, 2).toUpperCase();
  const doc: ChainDoc = {
    _id: id,
    slug,
    name: opts.name.trim(),
    tagline: opts.tagline.trim() || "Ofertas publicadas en TraGo",
    description: opts.description.trim() || "Cadena registrada para publicar promociones.",
    mark,
    markColor: "#c4a574",
    website: opts.website.trim(),
    tier: "free",
    publishesPromos: true,
    hasApiAccess: false,
    showAds: true,
    ownerUserId: opts.user.id,
  };
  await col.chains.insertOne(doc);
  const { ObjectId } = await import("mongodb");
  if (ObjectId.isValid(opts.user.id)) {
    await col.users.updateOne({ _id: new ObjectId(opts.user.id) }, { $set: { role: "chain" } });
  }
  return chainFromDoc(doc);
}

export async function publishChainPromo(opts: {
  userId: string;
  chainId: string;
  title: string;
  subtitle: string;
  kind: PromoKind;
  terms: string;
  startsAt: Date;
  endsAt: Date;
  alcohol?: boolean;
  isNocturno?: boolean;
  isBirthday?: boolean;
  branchIds: string[];
}) {
  if (!hasMongoUri()) throw new VoteError(503, "Publicar promo necesita MongoDB.");
  await ensureIndexesAndSeed();
  const col = await collections();
  const chain = await col.chains.findOne({ _id: opts.chainId, ownerUserId: opts.userId });
  if (!chain) throw new VoteError(403, "No operas esta cadena.");

  const base = opts.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const slug = `${chain.slug}-${base}-${Date.now().toString(36)}`;
  const id = `p-${slug}`;
  await col.promos.insertOne({
    _id: id,
    slug,
    chainId: chain._id,
    chainName: chain.name,
    title: opts.title.trim(),
    subtitle: opts.subtitle.trim(),
    kind: opts.kind,
    isNocturno: Boolean(opts.isNocturno),
    alcohol: Boolean(opts.alcohol),
    isBirthday: Boolean(opts.isBirthday),
    startsAt: opts.startsAt,
    endsAt: opts.endsAt,
    terms: opts.terms.trim() || "Sujeto a existencias y sucursales participantes.",
    imageUrl:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&h=800&fit=crop",
    featured: false,
    isDemo: false,
    origin: "chain",
  });

  const branchIds =
    opts.branchIds.length > 0
      ? opts.branchIds
      : (await col.branches.find({ chainId: chain._id }).toArray()).map((b) => b._id);

  if (branchIds.length) {
    await col.branchPromos.insertMany(
      branchIds.map((branchId) => ({
        promoId: id,
        branchId,
        officialActive: true,
        reportsVigente: 0,
        reportsCaduco: 0,
      })),
    );
  }

  return { id, slug };
}

export type NearbyQueryResult = {
  source: "geoNear" | "haversine";
  rows: ReturnType<typeof nearbyPromos>;
};

export async function queryNearbyPromos(
  origin: GeoPoint,
  opts?: { nocturno?: boolean; birthday?: boolean; maxKm?: number },
): Promise<NearbyQueryResult> {
  const maxKm = opts?.maxKm ?? 40;

  if (!hasMongoUri()) {
    return { source: "haversine", rows: nearbyPromos(seedCatalog(), origin, { ...opts, maxKm }) };
  }

  try {
    await ensureIndexesAndSeed();
    const col = await collections();
    const nearDocs = await col.branches
      .aggregate<(BranchDoc & { dist: number })>([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [origin.lng, origin.lat] },
            distanceField: "dist",
            maxDistance: maxKm * 1000,
            spherical: true,
            key: "location",
          },
        },
      ])
      .toArray();

    if (nearDocs.length === 0) {
      return { source: "geoNear", rows: [] };
    }

    const branchIds = nearDocs.map((d) => d._id);
    const linkDocs = await col.branchPromos.find({ branchId: { $in: branchIds } }).toArray();
    const promoIds = [...new Set(linkDocs.map((l) => l.promoId))];
    const promoDocs =
      promoIds.length === 0
        ? []
        : await col.promos.find({ _id: { $in: promoIds } }).toArray();
    const links = await overlayRecentVotes(linkDocs);
    const mini = catalogFrom(
      [],
      nearDocs.map(branchFromDoc),
      promoDocs.map(promoFromDoc),
      links,
    );
    return {
      source: "geoNear",
      rows: nearbyPromos(mini, origin, { ...opts, maxKm }),
    };
  } catch {
    const catalog = await getCatalog();
    return { source: "haversine", rows: nearbyPromos(catalog, origin, { ...opts, maxKm }) };
  }
}

export async function savePushSubscription(opts: {
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  if (!hasMongoUri()) {
    throw new VoteError(503, "Push necesita MongoDB.");
  }
  await ensureIndexesAndSeed();
  const col = await collections();
  const now = new Date();
  await col.pushSubs.updateOne(
    { endpoint: opts.endpoint },
    {
      $set: {
        userId: opts.userId,
        keys: opts.keys,
        updatedAt: now,
      },
      $setOnInsert: {
        endpoint: opts.endpoint,
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

export async function deletePushSubscription(endpoint: string) {
  if (!hasMongoUri()) return;
  const col = await collections();
  await col.pushSubs.deleteOne({ endpoint });
}

export async function listPushSubsForUserIds(userIds: string[]) {
  if (!hasMongoUri() || userIds.length === 0) return [];
  const col = await collections();
  return col.pushSubs.find({ userId: { $in: userIds } }).toArray();
}

export async function listAdultUsers() {
  if (!hasMongoUri()) return [];
  const col = await collections();
  return col.users.find({ "age.confirmed18": true }).toArray();
}

export { collections };
