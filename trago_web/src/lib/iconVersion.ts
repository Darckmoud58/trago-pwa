/**
 * Única fuente de versión de logos PWA.
 * Al cambiar iconos en public/: sube ICON_VERSION y el ?v= en index.html.
 */
export const ICON_VERSION = 4;

export const ICON_192 = `/icon-192-v2.png?v=${ICON_VERSION}`;
export const ICON_512 = `/icon-512-v2.png?v=${ICON_VERSION}`;
export const APPLE_TOUCH = `/apple-touch-icon.png?v=${ICON_VERSION}`;
export const FAVICON = `/favicon.png?v=${ICON_VERSION}`;

export const SW_ICON_TAG = `trago-icons-v${ICON_VERSION}`;
