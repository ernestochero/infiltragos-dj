import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit } from '@survey/lib/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimit());

  it('allows first request and blocks second within interval', () => {
    const ip = '1.1.1.1';
    expect(checkRateLimit(ip).allowed).toBe(true);
    const second = checkRateLimit(ip);
    expect(second.allowed).toBe(false);
    expect(second.retryAfter).toBeGreaterThan(0);
  });
});
