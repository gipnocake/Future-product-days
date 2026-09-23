import "server-only";
import type { KVStore } from "./store";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Fixed-window limiter: `limit` requests per `windowSeconds` per key. */
export async function rateLimit(
  store: KVStore,
  key: string,
  limit: number,
  windowSeconds = 60,
  now = Date.now(),
): Promise<RateLimitResult> {
  const window = Math.floor(now / 1000 / windowSeconds);
  const count = await store.incr(`rl:${key}:${window}`, windowSeconds);
  const retryAfterSeconds = (window + 1) * windowSeconds - Math.floor(now / 1000);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterSeconds };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
