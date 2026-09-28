import "server-only";

/**
 * Small fixed-window rate limiter held in memory.
 *
 * Good enough to blunt casual abuse (form spam, password guessing) on a
 * low-traffic site. On serverless each instance has its own memory, so for
 * stronger guarantees swap this for Upstash Redis / Vercel KV — the
 * signature is deliberately simple so that's a drop-in change.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return { ok: true, retryAfterMs: 0 };
  }
  b.count += 1;
  return b.count > limit ? { ok: false, retryAfterMs: b.resetAt - now } : { ok: true, retryAfterMs: 0 };
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
