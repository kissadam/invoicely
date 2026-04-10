/**
 * Simple in-memory rate limiter.
 * Limits magic link requests to 5 per IP per 10 minutes.
 * Works on a single server — good enough for self-hosted / Vercel serverless
 * (each serverless instance has its own memory, which is acceptable for this use case).
 */

interface Entry {
  count: number;
  resetAt: number;
}

// Use globalThis to persist across hot reloads in dev
const store: Map<string, Entry> =
  (globalThis as unknown as Record<string, unknown>).__rl_store as Map<string, Entry> ??
  (() => {
    const m = new Map<string, Entry>();
    (globalThis as unknown as Record<string, unknown>).__rl_store = m;
    return m;
  })();

export function checkRateLimit(
  key: string,
  maxRequests = 5,
  windowMs = 10 * 60 * 1000,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}