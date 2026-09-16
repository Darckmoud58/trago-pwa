/**
 * Nombres canónicos de colecciones MongoDB (acordados con BD / clase PWA).
 * Las claves en inglés se usan en el código Next; el valor es el nombre real en Atlas.
 */
export const COLLECTIONS = {
  usuarios: "usuarios",
  roles: "roles",
  categorias: "categorias",
  negocios: "negocios",
  sucursales: "sucursales",
  promociones: "promociones",
  fuentesPromociones: "fuentesPromociones",
  cupones: "cupones",
  favoritos: "favoritos",
  resenas: "resenas",
  reportes: "reportes",
  niveles: "niveles",
  detallesPuntos: "detallesPuntos",
  insignias: "insignias",
  usuarioInsignias: "usuarioInsignias",
  referidos: "referidos",
  suscripcionesNegocio: "suscripcionesNegocio",
  pagosSuscripcion: "pagosSuscripcion",
  notificaciones: "notificaciones",
  /** Promo ↔ sucursal + votos de vigencia (núcleo TraGo / GPS) */
  promoSucursales: "promoSucursales",
  /** Seguridad / auth auxiliares */
  authLocks: "authLocks",
  passwordResets: "passwordResets",
  twoFactorChallenges: "twoFactorChallenges",
  pushSubs: "pushSubs",
  meta: "meta",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
