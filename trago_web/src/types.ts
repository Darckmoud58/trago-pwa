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
  /** ISO YYYY-MM-DD (UTC mediodía al registrar). */
  birthDate?: string;
  fecha_nacimiento?: string;
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
  chainId?: string;
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
  origen?: 'oficial' | 'empresa' | 'demo' | 'usuario' | string;
  /** Cerca: oferta 18+ visible solo con cuenta adulta. */
  requiresAuth?: boolean;
  /** Precio publicado por la fuente (null si no hay cifra legible). */
  precio?: number | null;
  price?: number | null;
  precioLista?: number | null;
  precio_lista?: number | null;
  listPrice?: number | null;
  precioTexto?: string | null;
  precio_texto?: string | null;
  priceLabel?: string | null;
  url_fuente?: string;
  ubicacionesCercanas?: {
    _id: string;
    nombre: string;
    distanceMeters: number;
    participacionConfirmada?: boolean;
  }[];
  sucursalesParticipantesCount?: number;
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
  label?: string;
  address?: string;
  colonia?: string;
  city?: string;
  distanceMeters?: number;
  hours?: string;
  osmUrl?: string;
  hasOfficialPromos?: boolean;
  officialBrand?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  lat?: number;
  long?: number;
  lng?: number;
  reportsVigente?: number;
  reportsCaduco?: number;
  officialActive?: boolean;
  crowdStatus?: 'vigente' | 'en_duda' | 'caduco' | 'fuera' | string;
  participacionConfirmada?: boolean;
  origenVinculo?: string;
  especificadoPorFuente?: boolean;
};
