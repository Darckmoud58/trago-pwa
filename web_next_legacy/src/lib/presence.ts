import { haversineKm } from "./geo";
import type { GeoPoint } from "./types";

/** Radio para votar “estoy en la sucursal”. Override: NEXT_PUBLIC_TRAGO_PRESENCE_MAX_KM */
export const DEFAULT_PRESENCE_MAX_KM = 0.4;

export const VOTE_WINDOW_DAYS = 14;
export const VOTES_PER_HOUR = 12;

export function presenceMaxKm(): number {
  const raw =
    process.env.NEXT_PUBLIC_TRAGO_PRESENCE_MAX_KM ?? process.env.TRAGO_PRESENCE_MAX_KM;
  const n = raw ? Number(raw) : DEFAULT_PRESENCE_MAX_KM;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PRESENCE_MAX_KM;
}

export function voteCutoff(now = new Date()): Date {
  return new Date(now.getTime() - VOTE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export function isNearBranch(
  user: GeoPoint,
  branch: GeoPoint,
  maxKm = presenceMaxKm(),
): boolean {
  return haversineKm(user, branch) <= maxKm;
}

export function parseGeo(lat: unknown, lng: unknown): GeoPoint | null {
  const a = typeof lat === "number" ? lat : Number(lat);
  const b = typeof lng === "number" ? lng : Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < -90 || a > 90 || b < -180 || b > 180) return null;
  return { lat: a, lng: b };
}

export class VoteError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "VoteError";
    this.status = status;
  }
}
