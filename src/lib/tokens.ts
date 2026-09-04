import { createHash, randomBytes, randomInt } from "node:crypto";

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function newResetToken() {
  return randomBytes(32).toString("base64url");
}

export function newOtpCode() {
  return String(randomInt(100000, 999999));
}

export const RESET_TTL_MS = 30 * 60 * 1000;
export const OTP_TTL_MS = 10 * 60 * 1000;
