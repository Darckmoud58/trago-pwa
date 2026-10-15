/**
 * Versión de iconos / logos de la PWA.
 * Súbela cada vez que cambies favicon, apple-touch o icon-*.png
 * → el manifest y el SW cambian → Chrome/Android suelen refrescar el icono
 *   en la próxima visita (iOS a veces exige quitar y volver a “Añadir a inicio”).
 */
export const ICON_VERSION = 4;

export const ICON_192 = `/icon-192-v2.png?v=${ICON_VERSION}`;
export const ICON_512 = `/icon-512-v2.png?v=${ICON_VERSION}`;
export const APPLE_TOUCH = `/apple-touch-icon.png?v=${ICON_VERSION}`;
export const FAVICON = `/favicon.png?v=${ICON_VERSION}`;

/** Prefijo para SW_RELEASE — forzar skipWaiting en clientes. */
export const SW_ICON_TAG = `trago-icons-v${ICON_VERSION}`;
