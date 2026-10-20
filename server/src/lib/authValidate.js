import { z } from 'zod';
import { MIN_ACCOUNT_AGE, yearsFromBirth } from './ageGate.js';

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Nombre demasiado corto').max(80).optional(),
    nombre: z.string().trim().min(1).max(80).optional(),
    ape_paterno: z.string().trim().max(80).optional(),
    ape_materno: z.string().trim().max(80).optional(),
    email: z.string().trim().email('Correo inválido').max(120).optional(),
    correo: z.string().trim().email('Correo inválido').max(120).optional(),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(72, 'Máximo 72 caracteres'),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate debe ser YYYY-MM-DD'),
    /** Ignorado: la edad se calcula en el servidor. */
    edad: z.any().optional(),
    confirmAge: z.boolean().optional(),
    acceptTerms: z.boolean().optional(),
    acceptPrivacy: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const mail = data.correo || data.email;
    if (!mail) {
      ctx.addIssue({
        code: 'custom',
        message: 'correo/email requerido',
        path: ['email'],
      });
    }
    if (!data.name && !data.nombre) {
      ctx.addIssue({
        code: 'custom',
        message: 'nombre requerido',
        path: ['name'],
      });
    }
  });

export const loginSchema = z
  .object({
    email: z.string().trim().email().max(120).optional(),
    correo: z.string().trim().email().max(120).optional(),
    password: z.string().min(1).max(72),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.correo && !data.email) {
      ctx.addIssue({
        code: 'custom',
        message: 'correo/email requerido',
        path: ['email'],
      });
    }
  });

export function zodErrorMessage(err) {
  return err.issues?.[0]?.message || 'Datos inválidos';
}

export function ageFromBirthDateStrict(birthDate) {
  const years = yearsFromBirth(birthDate);
  if (years == null || !Number.isFinite(years)) {
    throw new Error('Fecha de nacimiento inválida');
  }
  if (years < MIN_ACCOUNT_AGE) {
    throw new Error('No pudimos crear tu cuenta');
  }
  if (years > 120) {
    throw new Error('Edad no válida');
  }
  return years;
}

/**
 * Hash bcrypt fijo solo para igualar tiempo cuando el usuario no existe.
 * No corresponde a ninguna contraseña de producción.
 */
export const TIMING_DUMMY_HASH =
  '$2b$10$qB5mLEFw4YnDmHe9QKyQc.XL9sPdCVL4f82sZ5PSRBqW1rbgVJWlW';
