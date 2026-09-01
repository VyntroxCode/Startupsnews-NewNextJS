import { createHash } from "crypto";
import type { NextRequest } from "next/server";

/** Same `x-forwarded-for`-first-segment pattern already used in
 * src/app/api/public-auth/linkedin/callback/route.ts — falls back to `x-real-ip`. */
export function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
}

/** One-way hash of a requester's IP for audit/rate-limit records — never store the raw IP. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "incubatx-dev-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
