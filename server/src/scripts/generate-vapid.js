#!/usr/bin/env node
/**
 * Genera un par VAPID para Web Push (mismo flujo que Todo_pwa: npm run vapid).
 * No escribe .env — cópialo tú a server/.env y, si hace falta, la pública al front.
 */
import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
# Pega en server/.env (y en Netlify → Environment variables)
VAPID_SUBJECT=mailto:tu@correo.com
VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}

# Opcional en trago_web/.env si no usas GET /api/push/subscribe
# VITE_VAPID_PUBLIC_KEY=${publicKey}

# Cron externo / Scheduled Function: POST /api/push/birthday
# CRON_SECRET=$(openssl rand -hex 24)
`);
