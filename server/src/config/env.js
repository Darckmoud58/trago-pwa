import { z } from 'zod';

const envSchema = z.object({
  JWT_SECRET: z
    .string({ error: 'JWT_SECRET es obligatorio' })
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  MONGODB_URI: z
    .string({ error: 'MONGODB_URI es obligatorio' })
    .min(1, 'MONGODB_URI es obligatorio'),
  MONGODB_DB: z.string().default('trago'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  NODE_ENV: z.string().optional(),
  NETLIFY: z.string().optional(),
  /** Vercel inyecta VERCEL=1; también aceptamos string "true". */
  VERCEL: z.string().optional(),
});

/** @type {z.infer<typeof envSchema> | null} */
let cached = null;

export function parseEnv(raw = process.env) {
  return envSchema.safeParse({
    JWT_SECRET: raw.JWT_SECRET,
    MONGODB_URI: raw.MONGODB_URI,
    MONGODB_DB: raw.MONGODB_DB,
    PORT: raw.PORT,
    CORS_ORIGINS: raw.CORS_ORIGINS,
    NODE_ENV: raw.NODE_ENV,
    NETLIFY: raw.NETLIFY,
    VERCEL: raw.VERCEL,
  });
}

/**
 * Valida y cachea env. Lanza Error si falta algo (sin process.exit:
 * el caller decide).
 */
export function requireEnv(raw = process.env) {
  const result = parseEnv(raw);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join('.') || 'env'}: ${i.message}`)
      .join('; ');
    throw new Error(`Configuración inválida: ${detail}`);
  }
  cached = result.data;
  return cached;
}

export function getEnv() {
  if (!cached) return requireEnv();
  return cached;
}

/** Resetea caché (solo tests). */
export function resetEnvCache() {
  cached = null;
}

export function corsOriginList(env = getEnv()) {
  return String(env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isDev(env = getEnv()) {
  return (env.NODE_ENV || process.env.NODE_ENV) !== 'production';
}

/** Netlify Function o Vercel serverless. */
export function isServerless(env = getEnv()) {
  const vercel = env.VERCEL || process.env.VERCEL;
  return (
    env.NETLIFY === 'true' ||
    process.env.NETLIFY === 'true' ||
    Boolean(vercel && vercel !== '0' && vercel !== 'false')
  );
}
