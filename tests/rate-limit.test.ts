import { describe, it, expect } from 'vitest';
import { rateLimit } from '../src/lib/rate-limit';

describe('rateLimit', () => {
  it('limits after threshold', () => {
    expect(rateLimit('a', 1, 1000)).toBe(true);
    expect(rateLimit('a', 1, 1000)).toBe(false);
  });
});
