import { describe, it, expect } from 'vitest';
import { rateLimit, rateLimitByRequest } from '@core/api/rate-limit';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE } from '@core/api/auth';

describe('rate-limit utilities', () => {
  describe('rateLimit', () => {
    it('limits after threshold', () => {
      const first = rateLimit('a', 1, 1000);
      expect(first.allowed).toBe(true);
      const second = rateLimit('a', 1, 1000);
      expect(second.allowed).toBe(false);
      expect(second.retryAfterMs).toBeGreaterThan(0);
    });
  });

  describe('rateLimitByRequest', () => {
    it('scopes by ip when no user session', () => {
      const req = {
        ip: '1.1.1.1',
        cookies: { get: () => undefined },
      } as unknown as NextRequest;
      const first = rateLimitByRequest(req, 'iptest', 1, 1000);
      expect(first.allowed).toBe(true);
      const second = rateLimitByRequest(req, 'iptest', 1, 1000);
      expect(second.allowed).toBe(false);
    });

    it('scopes by user when session cookie exists', () => {
      const req = {
        ip: '1.1.1.1',
        cookies: {
          get: (name: string) =>
            name === ADMIN_COOKIE ? { value: 'user1' } : undefined,
        },
      } as unknown as NextRequest;
      const first = rateLimitByRequest(req, 'usertest', 1, 1000);
      expect(first.allowed).toBe(true);
      const req2 = {
        ip: '2.2.2.2',
        cookies: {
          get: (name: string) =>
            name === ADMIN_COOKIE ? { value: 'user1' } : undefined,
        },
      } as unknown as NextRequest;
      const second = rateLimitByRequest(req2, 'usertest', 1, 1000);
      expect(second.allowed).toBe(false);
    });
  });
});
