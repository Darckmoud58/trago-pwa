import type { Document } from "mongodb";
import type { Branch, BranchPromo, Chain, Promo, VenueKind } from "./types";

export interface UserDoc extends Document {
  email: string;
  passwordHash?: string;
  googleId?: string;
  profile: { name: string; picture?: string };
  age: {
    birthDate: Date;
    yearsAtSignup: number;
    confirmed18: true;
    confirmedAt: Date;
  };
  role: "user";
  createdAt: Date;
}

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
}

export interface BranchDoc extends Document {
  _id: string;
  slug: string;
  chainId: string;
  chainName: string;
  name: string;
  kind: VenueKind;
  address: string;
  colonia: string;
  city: string;
  location: { type: "Point"; coordinates: [number, number] };
  hours: string;
  imageUrl: string;
}

export interface PromoDoc extends Document {
  _id: string;
  slug: string;
  chainId: string;
  chainName: string;
  title: string;
  subtitle: string;
  kind: Promo["kind"];
  isNocturno: boolean;
  alcohol: boolean;
  isBirthday: boolean;
  startsAt: Date;
  endsAt: Date;
  terms: string;
  imageUrl: string;
  featured: boolean;
  isDemo: boolean;
  sourceUrl?: string;
  sourceLabel?: string;
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
    isBirthday: Boolean(d.isBirthday),
    startsAt: d.startsAt.toISOString(),
    endsAt: d.endsAt.toISOString(),
    terms: d.terms,
    imageUrl: d.imageUrl,
    featured: d.featured,
    isDemo: d.isDemo,
    sourceUrl: d.sourceUrl,
    sourceLabel: d.sourceLabel,
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
