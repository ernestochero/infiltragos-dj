interface Record {
  count: number;
  expires: number;
}

const store = new Map<string, Record>();

/**
 * Simple in-memory rate limiter. Returns true if allowed.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const rec = store.get(key);
  if (!rec || rec.expires < now) {
    store.set(key, { count: 1, expires: now + windowMs });
    return true;
  }
  if (rec.count >= limit) return false;
  rec.count++;
  return true;
}
