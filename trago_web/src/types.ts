export type Band = 'teen' | 'adult' | string;

export type AuthUser = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  band?: Band;
  points?: number;
  profile?: { name?: string };
  age?: { band?: Band };
};

export type Promo = {
  _id: string;
  slug: string;
  title: string;
  subtitle?: string;
  chainName?: string;
  kind?: string;
  alcohol?: boolean;
  audience?: 'all' | 'adult';
  isNocturno?: boolean;
  isBirthday?: boolean;
  featured?: boolean;
  endsAt?: string;
  imageUrl?: string;
  origin?: string;
};

export type Branch = {
  _id: string;
  slug: string;
  name: string;
  chainName?: string;
  address?: string;
  colonia?: string;
  city?: string;
  distanceMeters?: number;
  hours?: string;
};

export type Negocio = {
  _id: string;
  slug?: string;
  name: string;
  kind?: string;
  plan?: string;
};
