import { createHash } from "node:crypto";

export {
  MAX_POINTS_PER_DAY,
  LOGIN_MAX_FAILURES,
  LOGIN_LOCK_MINUTES,
  REGISTER_MAX_PER_HOUR,
  REVIEW_MAX_PER_HOUR,
  clientIp,
  assertSameOrigin,
  sanitizeText,
  SecurityError,
  hitRateLimit,
} from "./security-limits";

export function textFingerprint(text: string): string {
  const norm = text.toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha256").update(norm).digest("hex");
}
