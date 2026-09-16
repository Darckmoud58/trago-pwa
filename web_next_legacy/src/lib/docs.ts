import type { Document } from "mongodb";
import type { Branch, BranchPromo, Chain, Promo, VenueKind } from "./types";

/** roles */
export interface RolDoc extends Document {
  _id: string;
  code: "user" | "chain" | "admin";
  name: string;
  description: string;
  permissions: string[];
  active: boolean;
}

/** categorias (venue o promo) */
export interface CategoriaDoc extends Document {
  _id: string;
  code: string;
  name: string;
  scope: "venue" | "promo";
  alcoholAllowed: boolean;
  active: boolean;
}

/** niveles de gamificación */
export interface NivelDoc extends Document {
  _id: string;
  code: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  benefits: string[];
  sortOrder: number;
}

/** insignias */
export interface InsigniaDoc extends Document {
  _id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  criteria: string;
  pointsBonus: number;
  active: boolean;
}

/** fuentes de promociones */
export interface FuentePromocionDoc extends Document {
  _id: string;
  name: string;
  type: "official" | "chain" | "user" | "demo";
  baseUrl?: string;
  active: boolean;
  notes?: string;
}

export interface UserDoc extends Document {
  email: string;
  passwordHash?: string;
  googleId?: string;
  profile: { name: string; picture?: string };
  age: {
    birthDate: Date;
    yearsAtSignup: number;
    /** true solo si al registrar/completar era (o es) 18+ */
    confirmed18: boolean;
    confirmedAt: Date;
    band?: "teen" | "adult";
  };
  /** legado: "user" | "chain"; preferir roleId */
  role: "user" | "chain";
  roleId?: string;
  nivelId?: string;
  points?: number;
  referralCode?: string;
  referredByUserId?: string;
  /** 2FA por código al correo tras la contraseña. */
  twoFactorEmail?: boolean;
  createdAt: Date;
}

/** negocios (antes chains) */
export interface ChainDoc extends Document {
  _id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  mark: string;
  markColor: string;
  website: string;
  tier: Chain["tier"];
  publishesPromos: boolean;
  hasApiAccess: boolean;
  showAds: boolean;
  ownerUserId?: string;
  categoriaId?: string;
  suscripcionId?: string;
}

/** sucursales */
export interface BranchDoc extends Document {
  _id: string;
  slug: string;
  chainId: string;
  chainName: string;
  name: string;
  kind: VenueKind;
  categoriaId?: string;
  address: string;
  colonia: string;
  city: string;
  location: { type: "Point"; coordinates: [number, number] };
  hours: string;
  imageUrl: string;
  active?: boolean;
}

export interface PromoDoc extends Document {
  _id: string;
  slug: string;
  chainId: string;
  chainName: string;
  title: string;
  subtitle: string;
  kind: Promo["kind"];
  categoriaId?: string;
  fuenteId?: string;
  isNocturno: boolean;
  alcohol: boolean;
  audience?: "all" | "adult";
  isBirthday: boolean;
  startsAt: Date;
  endsAt: Date;
  terms: string;
  imageUrl: string;
  featured: boolean;
  isDemo: boolean;
  sourceUrl?: string;
  sourceLabel?: string;
  origin?: "official" | "chain" | "demo";
  active?: boolean;
}

export interface ReviewDoc extends Document {
  userId: string;
  userName: string;
  promoId: string;
  branchId: string;
  rating: number;
  text: string;
  textHash: string;
  nearStore: boolean;
  pointsAwarded: number;
  createdAt: Date;
  updatedAt?: Date;
  lat?: number;
  lng?: number;
}

export interface CouponDoc extends Document {
  userId: string;
  code: string;
  label: string;
  costPoints: number;
  promocionId?: string;
  createdAt: Date;
  redeemedAt?: Date | null;
  expiresAt?: Date | null;
  status?: "active" | "redeemed" | "expired";
}

export interface PointLedgerDoc extends Document {
  userId: string;
  delta: number;
  reason: "vote" | "review" | "redeem" | "referral" | "badge" | "signup";
  /** Clave única anti-farmeo, p.ej. vote:user:promo:branch */
  refKey: string;
  createdAt: Date;
  meta?: Record<string, string>;
}

export interface FavoritoDoc extends Document {
  userId: string;
  targetType: "promocion" | "sucursal" | "negocio";
  targetId: string;
  createdAt: Date;
}

export interface UsuarioInsigniaDoc extends Document {
  userId: string;
  insigniaId: string;
  earnedAt: Date;
  pointsAwarded: number;
}

export interface ReferidoDoc extends Document {
  referrerUserId: string;
  referredUserId?: string;
  code: string;
  status: "pending" | "completed" | "rewarded";
  pointsAwarded: number;
  createdAt: Date;
  completedAt?: Date | null;
}

export interface SuscripcionNegocioDoc extends Document {
  negocioId: string;
  plan: "free" | "pro" | "premium";
  startsAt: Date;
  endsAt?: Date | null;
  active: boolean;
  autoRenew: boolean;
  createdAt: Date;
}

export interface PagoSuscripcionDoc extends Document {
  suscripcionId: string;
  negocioId: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  provider?: string;
  providerRef?: string;
  paidAt?: Date | null;
  createdAt: Date;
}

export interface NotificacionDoc extends Document {
  userId: string;
  type: "push" | "email" | "in_app" | "birthday" | "promo" | "system";
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, string>;
  createdAt: Date;
}

export interface AuthLockDoc extends Document {
  _id: string;
  failures: number;
  lockedUntil?: Date | null;
  updatedAt: Date;
}

export interface PasswordResetDoc extends Document {
  email: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date | null;
}

export interface TwoFactorChallengeDoc extends Document {
  userId: string;
  codeHash: string;
  expiresAt: Date;
  createdAt: Date;
  attempts: number;
}

export interface BranchPromoDoc extends Document {
  promoId: string;
  branchId: string;
  officialActive: boolean;
  reportsVigente: number;
  reportsCaduco: number;
}

export interface ReportDoc extends Document {
  userId: string;
  promoId: string;
  branchId: string;
  stillValid: boolean;
  motivo?: string;
  createdAt: Date;
  updatedAt: Date;
  lat?: number;
  lng?: number;
}

export interface PushSubDoc extends Document {
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: Date;
  updatedAt: Date;
}

export function chainFromDoc(d: ChainDoc): Chain {
  return {
    id: d._id,
    slug: d.slug,
    name: d.name,
    tagline: d.tagline,
    description: d.description,
    mark: d.mark,
    markColor: d.markColor,
    website: d.website,
    tier: d.tier,
    publishesPromos: d.publishesPromos,
    hasApiAccess: d.hasApiAccess,
    showAds: d.showAds,
    ownerUserId: d.ownerUserId,
  };
}

export function branchFromDoc(d: BranchDoc): Branch {
  const [lng, lat] = d.location.coordinates;
  return {
    id: d._id,
    slug: d.slug,
    chainId: d.chainId,
    name: d.name,
    kind: d.kind,
    address: d.address,
    colonia: d.colonia,
    city: d.city,
    geo: { lat, lng },
    hours: d.hours,
    imageUrl: d.imageUrl,
  };
}

export function promoFromDoc(d: PromoDoc): Promo {
  return {
    id: d._id,
    slug: d.slug,
    chainId: d.chainId,
    title: d.title,
    subtitle: d.subtitle,
    kind: d.kind,
    isNocturno: d.isNocturno,
    alcohol: d.alcohol,
    audience: d.alcohol ? "adult" : d.audience ?? "all",
    isBirthday: Boolean(d.isBirthday),
    startsAt: d.startsAt.toISOString(),
    endsAt: d.endsAt.toISOString(),
    terms: d.terms,
    imageUrl: d.imageUrl,
    featured: d.featured,
    isDemo: d.isDemo,
    sourceUrl: d.sourceUrl,
    sourceLabel: d.sourceLabel,
    origin: d.origin ?? (d.sourceUrl ? "official" : d.isDemo ? "demo" : "chain"),
  };
}

export function linkFromDoc(d: BranchPromoDoc): BranchPromo {
  return {
    promoId: d.promoId,
    branchId: d.branchId,
    officialActive: d.officialActive,
    reportsVigente: d.reportsVigente,
    reportsCaduco: d.reportsCaduco,
  };
}
