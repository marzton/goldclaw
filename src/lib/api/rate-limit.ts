// Consolidated from goldshore-api/src/index.ts
// Rate limiting implementation

export interface RateLimitEnv {
  KV_CACHE: KVNamespace;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

const DEFAULT_RATE_LIMIT = 120;
const DEFAULT_RATE_LIMIT_WINDOW = 60; // seconds

export async function enforceRateLimit(
  identifier: string,
  env: RateLimitEnv
): Promise<RateLimitResult> {
  const limit = Number(env.RATE_LIMIT_MAX ?? DEFAULT_RATE_LIMIT) || DEFAULT_RATE_LIMIT;
  const windowSeconds = Number(env.RATE_LIMIT_WINDOW ?? DEFAULT_RATE_LIMIT_WINDOW) || DEFAULT_RATE_LIMIT_WINDOW;
  const now = Date.now();
  const windowId = Math.floor(now / (windowSeconds * 1000));
  const storageKey = `rate:${identifier}:${windowId}`;

  const currentCountRaw = await env.KV_CACHE.get(storageKey);
  const currentCount = currentCountRaw ? Number(currentCountRaw) : 0;

  if (currentCount >= limit) {
    const resetAt = (windowId + 1) * windowSeconds * 1000;
    return { allowed: false, remaining: 0, reset: resetAt };
  }

  const updatedCount = currentCount + 1;
  await env.KV_CACHE.put(storageKey, String(updatedCount), { expirationTtl: windowSeconds + 5 });
  const resetAt = (windowId + 1) * windowSeconds * 1000;

  return { allowed: true, remaining: Math.max(limit - updatedCount, 0), reset: resetAt };
}

export function applyRateLimitHeaders(headers: Headers, result: RateLimitResult, limit: number): void {
  headers.set("X-RateLimit-Limit", String(limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(Math.floor(result.reset / 1000)));
}
