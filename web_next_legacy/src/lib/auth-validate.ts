import { hash, compare } from "bcryptjs";
import { z } from "zod";
import {
  ageBandFromBirth,
  ageFromBirthDate,
  canOpenAccount,
  isAdult,
  MIN_ACCOUNT_AGE,
  MIN_AGE,
} from "./age";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Nombre demasiado corto").max(80),
    email: z.string().trim().email("Correo inválido").max(120),
    password: z
      .string()
      .min(10, "Mínimo 10 caracteres")
      .max(72)
      .regex(/[A-Za-z]/, "Incluye al menos una letra")
      .regex(/[0-9]/, "Incluye al menos un número"),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    confirmAge: z.boolean().refine((v) => v === true, {
      message: "Debes confirmar tu edad",
    }),
    /** Solo requerido si la fecha indica 18+; el API lo valida. */
    confirm18: z.boolean().optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email().max(120),
    password: z.string().min(1).max(72),
  })
  .strict();

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export function parseBirthDate(isoDay: string): Date {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function assertEligibleAccount(birth: Date) {
  if (!canOpenAccount(birth)) {
    throw new Error(`Necesitas al menos ${MIN_ACCOUNT_AGE} años para crear una cuenta.`);
  }
}

/** @deprecated usar assertEligibleAccount para registro */
export function assertAdult(birth: Date) {
  if (!isAdult(birth)) {
    throw new Error(`Para alcohol y panel necesitas ${MIN_AGE}+.`);
  }
}

export function ageFieldsForSignup(birth: Date, now = new Date()) {
  const adult = isAdult(birth, now);
  return {
    birthDate: birth,
    yearsAtSignup: ageFromBirthDate(birth, now),
    confirmed18: adult,
    confirmedAt: now,
    band: ageBandFromBirth(birth, now),
  };
}
