import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { isAdult, MIN_AGE } from "./age";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(80),
  email: z.string().trim().email("Correo inválido").max(120),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  confirm18: z.boolean().refine((v) => v === true, {
    message: "Debes confirmar que eres mayor de edad",
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export function parseBirthDate(isoDay: string): Date {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function assertAdult(birth: Date) {
  if (!isAdult(birth)) {
    throw new Error(`TraGo es ${MIN_AGE}+. No podemos crear la cuenta.`);
  }
}
