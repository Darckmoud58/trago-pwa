import { cache } from "react";
import { after } from "next/server";
import type { OptionalId } from "mongodb";
import { catalogFrom, nearbyPromos } from "./catalog";
import { COLLECTIONS } from "./collections";
import {
  branchFromDoc,
  chainFromDoc,
  linkFromDoc,
  promoFromDoc,
  type BranchDoc,
  type BranchPromoDoc,
  type CategoriaDoc,
  type ChainDoc,
  type CouponDoc,
  type FavoritoDoc,
  type FuentePromocionDoc,
  type InsigniaDoc,
  type NivelDoc,
  type NotificacionDoc,
  type PagoSuscripcionDoc,
  type PointLedgerDoc,
  type AuthLockDoc,
  type PasswordResetDoc,
  type TwoFactorChallengeDoc,
  type PromoDoc,
  type PushSubDoc,
  type ReferidoDoc,
  type ReportDoc,
  type ReviewDoc,
  type RolDoc,
  type SuscripcionNegocioDoc,
  type UserDoc,
  type UsuarioInsigniaDoc,
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
  POINTS_VOTE,
  couponCode,
} from "./rewards";
import {
  LOGIN_LOCK_MINUTES,
  LOGIN_MAX_FAILURES,
  MAX_POINTS_PER_DAY,
  REVIEW_MAX_PER_HOUR,
  sanitizeText,
  textFingerprint,
} from "./security";
import type { Catalog, GeoPoint, PromoKind, SessionUser } from "./types";

async function collections() {
  const db = await getMongo();
  return {
    users: db.collection<UserDoc>(COLLECTIONS.usuarios),
    roles: db.collection<RolDoc>(COLLECTIONS.roles),
    categorias: db.collection<CategoriaDoc>(COLLECTIONS.categorias),
    chains: db.collection<ChainDoc>(COLLECTIONS.negocios),
    branches: db.collection<BranchDoc>(COLLECTIONS.sucursales),
    promos: db.collection<PromoDoc>(COLLECTIONS.promociones),
    fuentes: db.collection<FuentePromocionDoc>(COLLECTIONS.fuentesPromociones),
    branchPromos: db.collection<BranchPromoDoc>(COLLECTIONS.promoSucursales),
    reports: db.collection<ReportDoc>(COLLECTIONS.reportes),
    reviews: db.collection<ReviewDoc>(COLLECTIONS.resenas),
    coupons: db.collection<CouponDoc>(COLLECTIONS.cupones),
    favoritos: db.collection<FavoritoDoc>(COLLECTIONS.favoritos),
    niveles: db.collection<NivelDoc>(COLLECTIONS.niveles),
    pointLedger: db.collection<PointLedgerDoc>(COLLECTIONS.detallesPuntos),
    insignias: db.collection<InsigniaDoc>(COLLECTIONS.insignias),
    usuarioInsignias: db.collection<UsuarioInsigniaDoc>(COLLECTIONS.usuarioInsignias),
    referidos: db.collection<ReferidoDoc>(COLLECTIONS.referidos),
    suscripciones: db.collection<SuscripcionNegocioDoc>(COLLECTIONS.suscripcionesNegocio),
    pagos: db.collection<PagoSuscripcionDoc>(COLLECTIONS.pagosSuscripcion),
    notificaciones: db.collection<NotificacionDoc>(COLLECTIONS.notificaciones),
    authLocks: db.collection<AuthLockDoc>(COLLECTIONS.authLocks),
    passwordResets: db.collection<PasswordResetDoc>(COLLECTIONS.passwordResets),
    twoFactorChallenges: db.collection<TwoFactorChallengeDoc>(COLLECTIONS.twoFactorChallenges),
    pushSubs: db.collection<PushSubDoc>(COLLECTIONS.pushSubs),
    meta: db.collection<{
      _id: string;
      version?: number;
      at?: Date;
      sources?: Record<string, { ok: boolean; count: number; error?: string }>;
    }>(COLLECTIONS.meta),
  };
}

let seeded = false;

export async function ensureIndexesAndSeed() {
  const col = await collections();
  await col.users.createIndex({ email: 1 }, { unique: true });
  await col.users.createIndex({ googleId: 1 }, { unique: true, sparse: true });
  await col.users.createIndex({ referralCode: 1 }, { unique: true, sparse: true });
  await col.users.createIndex({ roleId: 1 }, { sparse: true });
  await col.roles.createIndex({ code: 1 }, { unique: true });
  await col.categorias.createIndex({ code: 1, scope: 1 }, { unique: true });
  await col.chains.createIndex({ slug: 1 }, { unique: true });
  await col.chains.createIndex({ ownerUserId: 1 }, { sparse: true });
  await col.chains.createIndex({ categoriaId: 1 }, { sparse: true });
  await col.branches.createIndex({ slug: 1 }, { unique: true });
  await col.branches.createIndex({ chainId: 1 });
  await col.branches.createIndex({ location: "2dsphere" });
  await col.promos.createIndex({ slug: 1 }, { unique: true });
  await col.promos.createIndex({ chainId: 1 });
  await col.promos.createIndex({ fuenteId: 1 }, { sparse: true });
  await col.fuentes.createIndex({ type: 1, name: 1 }, { unique: true });
  await col.branchPromos.createIndex({ promoId: 1, branchId: 1 }, { unique: true });
  await col.reports.createIndex({ userId: 1, promoId: 1, branchId: 1 }, { unique: true });
  await col.reports.createIndex({ userId: 1, updatedAt: -1 });
  await col.reports.createIndex({ promoId: 1, branchId: 1, updatedAt: -1 });
  await col.pushSubs.createIndex({ endpoint: 1 }, { unique: true });
  await col.pushSubs.createIndex({ userId: 1 });
  await col.reviews.createIndex({ promoId: 1, createdAt: -1 });
  await col.reviews.createIndex({ userId: 1, promoId: 1, branchId: 1 }, { unique: true });
  await col.reviews.createIndex({ userId: 1, createdAt: -1 });
  await col.coupons.createIndex({ userId: 1, createdAt: -1 });
  await col.coupons.createIndex({ code: 1 }, { unique: true });
  await col.favoritos.createIndex(
    { userId: 1, targetType: 1, targetId: 1 },
    { unique: true },
  );
  await col.niveles.createIndex({ code: 1 }, { unique: true });
  await col.niveles.createIndex({ minPoints: 1 });
  await col.pointLedger.createIndex({ refKey: 1 }, { unique: true });
  await col.pointLedger.createIndex({ userId: 1, createdAt: -1 });
  await col.insignias.createIndex({ code: 1 }, { unique: true });
  await col.usuarioInsignias.createIndex({ userId: 1, insigniaId: 1 }, { unique: true });
  await col.referidos.createIndex({ code: 1 }, { unique: true });
  await col.referidos.createIndex({ referrerUserId: 1 });
  await col.suscripciones.createIndex({ negocioId: 1, active: 1 });
  await col.pagos.createIndex({ suscripcionId: 1, createdAt: -1 });
  await col.notificaciones.createIndex({ userId: 1, createdAt: -1 });
  await col.notificaciones.createIndex({ userId: 1, read: 1 });
  await col.authLocks.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });
  await col.passwordResets.createIndex({ tokenHash: 1 }, { unique: true });
  await col.passwordResets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await col.twoFactorChallenges.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await col.twoFactorChallenges.createIndex({ userId: 1 });

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
    await seedCatalogLookups(col);
  } else if ((await col.chains.countDocuments()) > 0) {
    seeded = true;
    return;
  } else {
    await seedCatalogLookups(col);
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
      active: true,
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
      audience: p.alcohol ? "adult" : p.audience ?? "all",
      isBirthday: p.isBirthday,
      startsAt: new Date(p.startsAt),
      endsAt: new Date(p.endsAt),
      terms: p.terms,
      imageUrl: p.imageUrl,
      featured: p.featured,
      isDemo: p.isDemo,
      fuenteId: p.isDemo ? "fuente-demo" : "fuente-chain",
      active: true,
    })),
  );
  await col.branchPromos.insertMany(branchPromos.map((l) => ({ ...l })));

  // Suscripciones demo según tier del negocio
  const tierPlan = { free: "free", pro: "pro", premium: "premium" } as const;
  await col.suscripciones.deleteMany({ negocioId: { $in: chains.map((c) => c.id) } });
  await col.suscripciones.insertMany(
    chains.map((c) => ({
      negocioId: c.id,
      plan: tierPlan[c.tier],
      startsAt: new Date(),
      endsAt: null,
      active: true,
      autoRenew: c.tier !== "free",
      createdAt: new Date(),
    })),
  );

  await col.meta.updateOne(
    { _id: "catalog" },
    { $set: { version: CATALOG_VERSION } },
    { upsert: true },
  );
  seeded = true;
}

type Cols = Awaited<ReturnType<typeof collections>>;

async function seedCatalogLookups(col: Cols) {
  await col.roles.deleteMany({});
  await col.roles.insertMany([
    {
      _id: "rol-user",
      code: "user",
      name: "Usuario",
      description: "Consumidor TraGo (teen o adult)",
      permissions: ["promos:read", "vote", "review", "favorites", "redeem"],
      active: true,
    },
    {
      _id: "rol-chain",
      code: "chain",
      name: "Negocio",
      description: "Dueño u operador de cadena / sucursal",
      permissions: ["promos:read", "promos:write", "panel", "subscription"],
      active: true,
    },
    {
      _id: "rol-admin",
      code: "admin",
      name: "Administrador",
      description: "Administración TraGo",
      permissions: ["*"],
      active: true,
    },
  ]);

  await col.categorias.deleteMany({});
  await col.categorias.insertMany([
    { _id: "cat-v-bar", code: "bar", name: "Bar", scope: "venue", alcoholAllowed: true, active: true },
    {
      _id: "cat-v-rest",
      code: "restaurante",
      name: "Restaurante",
      scope: "venue",
      alcoholAllowed: true,
      active: true,
    },
    { _id: "cat-v-cafe", code: "cafe", name: "Café", scope: "venue", alcoholAllowed: false, active: true },
    {
      _id: "cat-v-tienda",
      code: "tienda",
      name: "Tienda",
      scope: "venue",
      alcoholAllowed: false,
      active: true,
    },
    {
      _id: "cat-v-lic",
      code: "licoreria",
      name: "Licorería",
      scope: "venue",
      alcoholAllowed: true,
      active: true,
    },
    { _id: "cat-p-2x1", code: "2x1", name: "2x1", scope: "promo", alcoholAllowed: true, active: true },
    {
      _id: "cat-p-comida",
      code: "comida",
      name: "Comida",
      scope: "promo",
      alcoholAllowed: false,
      active: true,
    },
    {
      _id: "cat-p-botella",
      code: "botella",
      name: "Botella",
      scope: "promo",
      alcoholAllowed: true,
      active: true,
    },
    {
      _id: "cat-p-cumple",
      code: "cumple",
      name: "Cumpleaños",
      scope: "promo",
      alcoholAllowed: false,
      active: true,
    },
    {
      _id: "cat-p-regalo",
      code: "regalo",
      name: "Regalo",
      scope: "promo",
      alcoholAllowed: false,
      active: true,
    },
    {
      _id: "cat-p-happy",
      code: "happy-hour",
      name: "Happy hour",
      scope: "promo",
      alcoholAllowed: true,
      active: true,
    },
    {
      _id: "cat-p-desc",
      code: "descuento",
      name: "Descuento",
      scope: "promo",
      alcoholAllowed: false,
      active: true,
    },
  ]);

  await col.niveles.deleteMany({});
  await col.niveles.insertMany([
    {
      _id: "nivel-novato",
      code: "novato",
      name: "Novato",
      minPoints: 0,
      maxPoints: 49,
      benefits: ["Votar vigencia", "Guardar favoritos"],
      sortOrder: 1,
    },
    {
      _id: "nivel-explorador",
      code: "explorador",
      name: "Explorador",
      minPoints: 50,
      maxPoints: 149,
      benefits: ["Cupones básicos", "Insignias"],
      sortOrder: 2,
    },
    {
      _id: "nivel-local",
      code: "local",
      name: "Local de confianza",
      minPoints: 150,
      maxPoints: 399,
      benefits: ["Cupones mejores", "Prioridad en reseñas"],
      sortOrder: 3,
    },
    {
      _id: "nivel-leyenda",
      code: "leyenda",
      name: "Leyenda GDL",
      minPoints: 400,
      maxPoints: null,
      benefits: ["Cupones premium", "Badge destacado"],
      sortOrder: 4,
    },
  ]);

  await col.insignias.deleteMany({});
  await col.insignias.insertMany([
    {
      _id: "ins-primer-voto",
      code: "primer_voto",
      name: "Primer voto",
      description: "Reportaste vigencia por primera vez",
      icon: "check",
      criteria: "1 reporte de vigencia",
      pointsBonus: 5,
      active: true,
    },
    {
      _id: "ins-cerca",
      code: "cerca_del_local",
      name: "Cerca del local",
      description: "Opinaste con GPS cerca de la sucursal",
      icon: "pin",
      criteria: "1 reseña nearStore",
      pointsBonus: 10,
      active: true,
    },
    {
      _id: "ins-nocturno",
      code: "buzo_nocturno",
      name: "Búho nocturno",
      description: "Usaste el modo nocturno",
      icon: "moon",
      criteria: "1 visita /nocturno autenticada",
      pointsBonus: 5,
      active: true,
    },
    {
      _id: "ins-referido",
      code: "invita_amigo",
      name: "Trae a un amigo",
      description: "Referiste a otro usuario",
      icon: "users",
      criteria: "1 referido completado",
      pointsBonus: 20,
      active: true,
    },
  ]);

  await col.fuentes.deleteMany({});
  await col.fuentes.insertMany([
    {
      _id: "fuente-official",
      name: "Página oficial",
      type: "official",
      baseUrl: undefined,
      active: true,
      notes: "Ingest de sitios públicos de la cadena",
    },
    {
      _id: "fuente-chain",
      name: "Publicada por el negocio",
      type: "chain",
      active: true,
      notes: "Panel TraGo / empresa",
    },
    {
      _id: "fuente-user",
      name: "Comunidad",
      type: "user",
      active: true,
      notes: "Votos y reportes de usuarios",
    },
    {
      _id: "fuente-demo",
      name: "Demo TraGo",
      type: "demo",
      active: true,
      notes: "Catálogo de demostración / tesis",
    },
  ]);
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

  // Puntos solo la primera vez que reportas esa promo+sucursal (no al cambiar de opinión).
  if (!prev) {
    await awardPointsOnce({
      userId: opts.userId,
      delta: POINTS_VOTE,
      reason: "vote",
      refKey: `vote:${opts.userId}:${opts.promoId}:${opts.branchId}`,
    });
  }

  return recountLinkVotes(opts.promoId, opts.branchId);
}

async function pointsEarnedLast24h(userId: string): Promise<number> {
  const col = await collections();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await col.pointLedger
    .aggregate<{ total: number }>([
      { $match: { userId, createdAt: { $gte: since }, delta: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$delta" } } },
    ])
    .toArray();
  return rows[0]?.total ?? 0;
}

/**
 * Otorga puntos una sola vez por refKey (anti-farmeo).
 * Respeta tope de puntos en 24 h.
 */
async function awardPointsOnce(opts: {
  userId: string;
  delta: number;
  reason: "vote" | "review";
  refKey: string;
}): Promise<{ awarded: number; points: number; skipped?: string }> {
  if (opts.delta <= 0) {
    const bal = await getUserPoints(opts.userId);
    return { awarded: 0, points: bal };
  }
  const col = await collections();
  const earned = await pointsEarnedLast24h(opts.userId);
  const room = Math.max(0, MAX_POINTS_PER_DAY - earned);
  const delta = Math.min(opts.delta, room);
  if (delta <= 0) {
    const bal = await getUserPoints(opts.userId);
    return { awarded: 0, points: bal, skipped: "tope diario de puntos" };
  }

  try {
    await col.pointLedger.insertOne({
      userId: opts.userId,
      delta,
      reason: opts.reason,
      refKey: opts.refKey,
      createdAt: new Date(),
    });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 11000) {
      const bal = await getUserPoints(opts.userId);
      return { awarded: 0, points: bal, skipped: "ya premiado" };
    }
    throw err;
  }

  const points = await addPoints(opts.userId, delta);
  return { awarded: delta, points };
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

  const updated = await col.users.findOneAndUpdate(
    { _id: new ObjectId(userId), points: { $gte: COUPON_COST } },
    { $inc: { points: -COUPON_COST } },
    { returnDocument: "after" },
  );
  if (!updated) {
    const user = await col.users.findOne({ _id: new ObjectId(userId) });
    throw new VoteError(400, `Necesitas ${COUPON_COST} puntos. Tienes ${user?.points ?? 0}.`);
  }

  const code = couponCode();
  const now = new Date();
  const refKey = `redeem:${userId}:${code}`;
  await col.pointLedger.insertOne({
    userId,
    delta: -COUPON_COST,
    reason: "redeem",
    refKey,
    createdAt: now,
  });
  await col.coupons.insertOne({
    userId,
    code,
    label: COUPON_LABEL,
    costPoints: COUPON_COST,
    createdAt: now,
    redeemedAt: null,
  });
  return { code, label: COUPON_LABEL, points: updated.points ?? 0 };
}

export async function assertLoginAllowed(lockKey: string) {
  if (!hasMongoUri()) return;
  const col = await collections();
  const doc = await col.authLocks.findOne({ _id: lockKey });
  if (doc?.lockedUntil && doc.lockedUntil > new Date()) {
    const mins = Math.ceil((doc.lockedUntil.getTime() - Date.now()) / 60000);
    throw new VoteError(429, `Demasiados intentos. Espera ~${mins} min.`);
  }
}

export async function recordLoginFailure(lockKey: string) {
  if (!hasMongoUri()) return;
  const col = await collections();
  const now = new Date();
  const doc = await col.authLocks.findOne({ _id: lockKey });
  const failures = (doc?.failures ?? 0) + 1;
  const lockedUntil =
    failures >= LOGIN_MAX_FAILURES
      ? new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60 * 1000)
      : null;
  await col.authLocks.updateOne(
    { _id: lockKey },
    { $set: { failures, lockedUntil, updatedAt: now } },
    { upsert: true },
  );
}

export async function clearLoginFailures(lockKey: string) {
  if (!hasMongoUri()) return;
  const col = await collections();
  await col.authLocks.deleteOne({ _id: lockKey });
}

export async function createPasswordReset(email: string) {
  await ensureIndexesAndSeed();
  const col = await collections();
  const user = await findUserByEmail(email);
  if (!user?.passwordHash) {
    return { created: false as const };
  }
  const { newResetToken, hashToken, RESET_TTL_MS } = await import("./tokens");
  const raw = newResetToken();
  const tokenHash = hashToken(raw);
  const now = new Date();
  await col.passwordResets.deleteMany({ email: user.email });
  await col.passwordResets.insertOne({
    email: user.email,
    tokenHash,
    expiresAt: new Date(now.getTime() + RESET_TTL_MS),
    createdAt: now,
    usedAt: null,
  });
  return { created: true as const, email: user.email, token: raw, name: user.profile.name };
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  await ensureIndexesAndSeed();
  const col = await collections();
  const { hashToken } = await import("./tokens");
  const { hashPassword } = await import("./auth-validate");
  const tokenHash = hashToken(token);
  const doc = await col.passwordResets.findOne({ tokenHash, usedAt: null });
  if (!doc || doc.expiresAt < new Date()) {
    throw new VoteError(400, "El enlace expiró o no es válido. Solicita otro.");
  }
  const user = await findUserByEmail(doc.email);
  if (!user) throw new VoteError(400, "El enlace expiró o no es válido. Solicita otro.");
  const passwordHash = await hashPassword(newPassword);
  const { ObjectId } = await import("mongodb");
  await col.users.updateOne({ _id: user._id }, { $set: { passwordHash } });
  await col.passwordResets.updateOne({ _id: doc._id }, { $set: { usedAt: new Date() } });
  await col.passwordResets.deleteMany({ email: doc.email, usedAt: null });
  await clearLoginFailures(`login:${doc.email}`);
  return { email: doc.email };
}

export async function setTwoFactorEmail(userId: string, enabled: boolean) {
  await ensureIndexesAndSeed();
  const col = await collections();
  const { ObjectId } = await import("mongodb");
  if (!ObjectId.isValid(userId)) throw new VoteError(400, "Usuario inválido.");
  await col.users.updateOne({ _id: new ObjectId(userId) }, { $set: { twoFactorEmail: enabled } });
  return enabled;
}

export async function getTwoFactorEnabled(userId: string) {
  const user = await findUserById(userId);
  return Boolean(user?.twoFactorEmail);
}

export async function createTwoFactorChallenge(userId: string) {
  await ensureIndexesAndSeed();
  const col = await collections();
  const { newOtpCode, hashToken, OTP_TTL_MS } = await import("./tokens");
  const code = newOtpCode();
  const now = new Date();
  await col.twoFactorChallenges.deleteMany({ userId });
  const result = await col.twoFactorChallenges.insertOne({
    userId,
    codeHash: hashToken(code),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    createdAt: now,
    attempts: 0,
  });
  return { challengeId: String(result.insertedId), code };
}

export async function verifyTwoFactorChallenge(challengeId: string, code: string) {
  await ensureIndexesAndSeed();
  const col = await collections();
  const { ObjectId } = await import("mongodb");
  const { hashToken } = await import("./tokens");
  if (!ObjectId.isValid(challengeId)) {
    throw new VoteError(400, "Código inválido o expirado.");
  }
  const doc = await col.twoFactorChallenges.findOne({ _id: new ObjectId(challengeId) });
  if (!doc || doc.expiresAt < new Date()) {
    throw new VoteError(400, "Código inválido o expirado.");
  }
  if (doc.attempts >= 5) {
    await col.twoFactorChallenges.deleteOne({ _id: doc._id });
    throw new VoteError(429, "Demasiados intentos. Vuelve a iniciar sesión.");
  }
  if (doc.codeHash !== hashToken(code.trim())) {
    await col.twoFactorChallenges.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } });
    throw new VoteError(401, "Código incorrecto.");
  }
  await col.twoFactorChallenges.deleteOne({ _id: doc._id });
  return { userId: doc.userId };
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

  const text = sanitizeText(opts.text);
  if (text.length < 12) {
    throw new VoteError(400, "Escribe al menos 12 caracteres (sin farmear con basura).");
  }
  const hash = textFingerprint(text);

  const link = await col.branchPromos.findOne({
    promoId: opts.promoId,
    branchId: opts.branchId,
  });
  if (!link) throw new VoteError(404, "Esa promo no está ligada a la sucursal.");

  const branch = await col.branches.findOne({ _id: opts.branchId });
  if (!branch) throw new VoteError(404, "Sucursal no encontrada.");
  const point = branchFromDoc(branch).geo;
  if (!opts.geo || !isNearBranch(opts.geo, point)) {
    const maxM = Math.round(presenceMaxKm() * 1000);
    throw new VoteError(
      403,
      `Para opinar y ganar puntos hay que estar a menos de ${maxM} m de la sucursal.`,
    );
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await col.reviews.countDocuments({
    userId: opts.userId,
    createdAt: { $gte: hourAgo },
  });
  if (recentCount >= REVIEW_MAX_PER_HOUR) {
    throw new VoteError(429, "Demasiadas opiniones en una hora.");
  }

  const dupText = await col.reviews.findOne({
    userId: opts.userId,
    textHash: hash,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  });
  if (dupText) {
    throw new VoteError(400, "Ese texto ya lo usaste. No farmees con el mismo comentario.");
  }

  const existing = await col.reviews.findOne({
    userId: opts.userId,
    promoId: opts.promoId,
    branchId: opts.branchId,
  });
  if (existing) {
    await col.reviews.updateOne(
      { _id: existing._id },
      {
        $set: {
          rating: opts.rating,
          text,
          textHash: hash,
          nearStore: true,
          updatedAt: new Date(),
          lat: opts.geo.lat,
          lng: opts.geo.lng,
        },
      },
    );
    const points = await getUserPoints(opts.userId);
    return {
      nearStore: true,
      pointsAwarded: 0,
      points,
      note: "Opinión actualizada. Los puntos solo se dan la primera vez.",
    };
  }

  const now = new Date();
  await col.reviews.insertOne({
    userId: opts.userId,
    userName: opts.userName.slice(0, 80),
    promoId: opts.promoId,
    branchId: opts.branchId,
    rating: opts.rating,
    text,
    textHash: hash,
    nearStore: true,
    pointsAwarded: 0,
    createdAt: now,
    lat: opts.geo.lat,
    lng: opts.geo.lng,
  });

  const award = await awardPointsOnce({
    userId: opts.userId,
    delta: POINTS_REVIEW_NEAR,
    reason: "review",
    refKey: `review:${opts.userId}:${opts.promoId}:${opts.branchId}`,
  });
  if (award.awarded > 0) {
    await col.reviews.updateOne(
      { userId: opts.userId, promoId: opts.promoId, branchId: opts.branchId },
      { $set: { pointsAwarded: award.awarded } },
    );
  }

  return {
    nearStore: true,
    pointsAwarded: award.awarded,
    points: award.points,
    note: award.skipped ? `Sin puntos: ${award.skipped}.` : undefined,
  };
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
    audience: opts.alcohol ? "adult" : "all",
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
