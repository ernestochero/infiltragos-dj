import { NextRequest } from 'next/server';
import { getSession } from './auth';

interface Record {
  count: number;
  expires: number;
}

const store = new Map<string, Record>();

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

/**
 * Simple in-memory rate limiter. Returns result with remaining time.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  if (process.env.NODE_ENV === 'development') {
    return { allowed: true, retryAfterMs: 0 };
  }

  const now = Date.now();
  const rec = store.get(key);
  if (!rec || rec.expires < now) {
    store.set(key, { count: 1, expires: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (rec.count >= limit) {
    return { allowed: false, retryAfterMs: rec.expires - now };
  }
  rec.count++;
  return { allowed: true, retryAfterMs: rec.expires - now };
}

/**
 * Rate limit scoped by user session (if present) or IP address.
 */
export function rateLimitByRequest(
  req: NextRequest,
  prefix: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const session = getSession(req);
  const user = session?.sub;
  const ip = req.ip ?? '0.0.0.0';
  const scope = user ? `u:${user}` : `ip:${ip}`;
  return rateLimit(`${prefix}:${scope}`, limit, windowMs);
}
