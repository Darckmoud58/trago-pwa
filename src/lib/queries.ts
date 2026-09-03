import { cache } from "react";
import { after } from "next/server";
import type { OptionalId } from "mongodb";
import { catalogFrom } from "./catalog";
import {
  branchFromDoc,
  chainFromDoc,
  linkFromDoc,
  promoFromDoc,
  type BranchDoc,
  type BranchPromoDoc,
  type ChainDoc,
  type PromoDoc,
  type ReportDoc,
  type UserDoc,
} from "./docs";
import { getMongo, hasMongoUri } from "./mongo";
import { CATALOG_VERSION, branchPromos, branches, chains, promos } from "./mock-data";
import type { Catalog } from "./types";

async function collections() {
  const db = await getMongo();
  return {
    users: db.collection<UserDoc>("users"),
    chains: db.collection<ChainDoc>("chains"),
    branches: db.collection<BranchDoc>("branches"),
    promos: db.collection<PromoDoc>("promos"),
    branchPromos: db.collection<BranchPromoDoc>("branchPromos"),
    reports: db.collection<ReportDoc>("reports"),
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

  if (seeded) return;
  const meta = await col.meta.findOne({ _id: "catalog" });
  const staleCity = await col.branches.findOne({ city: "CDMX" });
  if (staleCity || !meta || meta.version !== CATALOG_VERSION) {
    await col.chains.deleteMany({});
    await col.branches.deleteMany({});
    await col.promos.deleteMany({});
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
  return catalogFrom(
    c.map(chainFromDoc),
    b.map(branchFromDoc),
    p.map(promoFromDoc),
    l.map(linkFromDoc),
  );
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

export async function getUserVote(userId: string, promoId: string, branchId: string) {
  const col = await collections();
  return col.reports.findOne({ userId, promoId, branchId });
}

export async function saveVote(opts: {
  userId: string;
  promoId: string;
  branchId: string;
  stillValid: boolean;
}) {
  await ensureIndexesAndSeed();
  const col = await collections();
  const prev = await col.reports.findOne({
    userId: opts.userId,
    promoId: opts.promoId,
    branchId: opts.branchId,
  });

  let incVigente = 0;
  let incCaduco = 0;
  if (!prev) {
    incVigente = opts.stillValid ? 1 : 0;
    incCaduco = opts.stillValid ? 0 : 1;
  } else if (prev.stillValid === opts.stillValid) {
    return col.branchPromos.findOne({ promoId: opts.promoId, branchId: opts.branchId });
  } else if (prev.stillValid && !opts.stillValid) {
    incVigente = -1;
    incCaduco = 1;
  } else {
    incVigente = 1;
    incCaduco = -1;
  }

  const now = new Date();
  await col.reports.updateOne(
    { userId: opts.userId, promoId: opts.promoId, branchId: opts.branchId },
    {
      $set: { stillValid: opts.stillValid, updatedAt: now },
      $setOnInsert: {
        userId: opts.userId,
        promoId: opts.promoId,
        branchId: opts.branchId,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  await col.branchPromos.updateOne(
    { promoId: opts.promoId, branchId: opts.branchId },
    { $inc: { reportsVigente: incVigente, reportsCaduco: incCaduco } },
  );

  return col.branchPromos.findOne({ promoId: opts.promoId, branchId: opts.branchId });
}

export { collections };
