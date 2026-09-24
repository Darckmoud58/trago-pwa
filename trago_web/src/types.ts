export type Band = 'teen' | 'adult' | string;

export type AuthUser = {
  id?: string;
  _id?: string;
  name?: string;
  nombre?: string;
  ape_paterno?: string;
  ape_materno?: string;
  email?: string;
  correo?: string;
  edad?: number;
  band?: Band;
  points?: number;
  puntos?: number;
  estatus?: string;
  profile?: { name?: string };
  age?: { band?: Band };
  rol?: { id?: string; nombre?: string; codigo?: string } | null;
  nivel?: {
    id?: string;
    nombre?: string;
    pts_min?: number;
    pts_max?: number | null;
    beneficio?: string;
    descripcion?: string;
  } | null;
};

export type Promo = {
  _id: string;
  slug: string;
  title?: string;
  nombre?: string;
  subtitle?: string;
  descripcion?: string;
  chainName?: string;
  kind?: string;
  alcohol?: boolean;
  audience?: 'all' | 'adult';
  audiencia?: 'todos' | 'adulto';
  isNocturno?: boolean;
  nocturno?: boolean;
  isBirthday?: boolean;
  cumpleanos?: boolean;
  featured?: boolean;
  destacada?: boolean;
  endsAt?: string;
  termina_en?: string;
  imageUrl?: string;
  imagen?: string;
  origin?: string;
  puntos?: number;
  politicas?: string;
  terms?: string;
};

export type Negocio = {
  _id: string;
  slug?: string;
  name?: string;
  nombre?: string;
  kind?: string;
  plan?: string;
  description?: string;
  descripcion?: string;
};

export type Branch = {
  _id: string;
  slug?: string;
  name?: string;
  nombre?: string;
  chainName?: string;
  address?: string;
  colonia?: string;
  city?: string;
  distanceMeters?: number;
  hours?: string;
};
