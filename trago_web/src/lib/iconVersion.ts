/**
 * Única fuente de versión de logos PWA.
 * El arte vive en public/icon-192-v2.png y public/icon-512-v2.png.
 * Al cambiarlo, sube ICON_VERSION: el build publica icon-192-vN.png
 * sin query, que es lo que Chrome exige para poder instalar.
 */
export const ICON_VERSION = 4;

export const ICON_ART_192 = '/icon-192-v2.png';
export const ICON_ART_512 = '/icon-512-v2.png';

export const ICON_192 = `/icon-192-v${ICON_VERSION}.png`;
export const ICON_512 = `/icon-512-v${ICON_VERSION}.png`;
export const APPLE_TOUCH = '/apple-touch-icon.png';
export const FAVICON = '/favicon.png';

export const SW_ICON_TAG = `trago-icons-v${ICON_VERSION}`;
