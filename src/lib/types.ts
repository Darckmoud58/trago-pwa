export type ChainTier = "free" | "pro" | "premium";

export type VenueKind =
  | "tienda"
  | "bar"
  | "antro"
  | "cantina"
  | "rooftop"
  | "licoreria"
  | "restaurante"
  | "cafe";

export type PromoKind =
  | "2x1"
  | "botella"
  | "happy-hour"
  | "cover"
  | "descuento"
  | "combo"
  | "comida"
  | "cumple"
  | "regalo";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Chain {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  mark: string;
  markColor: string;
  website: string;
  tier: ChainTier;
  publishesPromos: boolean;
  hasApiAccess: boolean;
  showAds: boolean;
  ownerUserId?: string;
}

export interface Branch {
  id: string;
  slug: string;
  chainId: string;
  name: string;
  kind: VenueKind;
  address: string;
  colonia: string;
  city: string;
  geo: GeoPoint;
  hours: string;
  imageUrl: string;
}

export interface Promo {
  id: string;
  slug: string;
  chainId: string;
  title: string;
  subtitle: string;
  kind: PromoKind;
  isNocturno: boolean;
  alcohol: boolean;
  isBirthday: boolean;
  startsAt: string;
  endsAt: string;
  terms: string;
  imageUrl: string;
  featured: boolean;
  isDemo: boolean;
  sourceUrl?: string;
  sourceLabel?: string;
  /** official = web de la cadena; chain = publicada en TraGo; demo = prototipo */
  origin?: "official" | "chain" | "demo";
}

export interface BranchPromo {
  promoId: string;
  branchId: string;
  officialActive: boolean;
  reportsVigente: number;
  reportsCaduco: number;
}

export interface Catalog {
  chains: Chain[];
  branches: Branch[];
  promos: Promo[];
  branchPromos: BranchPromo[];
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isAdult: boolean;
  birthDate: string;
}

export const KIND_LABELS: Record<PromoKind, string> = {
  "2x1": "2x1",
  botella: "Botella",
  "happy-hour": "Happy hour",
  cover: "Cover",
  descuento: "Descuento",
  combo: "Combo",
  comida: "Comida",
  cumple: "Cumpleaños",
  regalo: "Regalo",
};

export const VENUE_LABELS: Record<VenueKind, string> = {
  tienda: "Tienda",
  bar: "Bar",
  antro: "Antro",
  cantina: "Cantina",
  rooftop: "Rooftop",
  licoreria: "Licorería",
  restaurante: "Restaurante",
  cafe: "Café",
};

export const TIER_LABELS: Record<ChainTier, string> = {
  free: "Freemium",
  pro: "Pro · destacadas",
  premium: "Premium · API",
};
