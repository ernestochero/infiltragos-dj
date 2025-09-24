import { NextRequest } from 'next/server';
import { getSession } from './auth';
import { getClientId } from './client-id';

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
  const cid = getClientId(req);
  const ip = getClientIp(req);
  const scope = user ? `u:${user}` : cid ? `cid:${cid}` : `ip:${ip}`;
  return rateLimit(`${prefix}:${scope}`, limit, windowMs);
}

/**
 * Best-effort client IP extraction supporting common proxy headers.
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xReal = req.headers.get('x-real-ip');
  if (xReal) return xReal;
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  return req.ip ?? '0.0.0.0';
}
