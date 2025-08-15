import { describe, it, expect } from 'vitest';
import { rateLimit } from '../src/lib/rate-limit';

describe('rateLimit', () => {
  it('limits after threshold', () => {
    const first = rateLimit('a', 1, 1000);
    expect(first.allowed).toBe(true);
    const second = rateLimit('a', 1, 1000);
    expect(second.allowed).toBe(false);
    expect(second.retryAfterMs).toBeGreaterThan(0);
  });
});
