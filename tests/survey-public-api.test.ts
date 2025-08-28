// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { GET } from '@survey/app/api/survey/[slug]/route';
import { NextRequest } from 'next/server';
import prisma from '@core/prisma';
vi.mock('@core/prisma', () => ({
  __esModule: true,
  default: {
    survey: { findUnique: vi.fn() },
  },
}));
const mocked = prisma as unknown as { survey: { findUnique: any } };

describe('GET /api/survey/[slug]', () => {
  it('returns 404 when survey not published', async () => {
    (mocked.survey.findUnique as any).mockResolvedValue({ status: 'DRAFT' });
    const req = new NextRequest('http://localhost/api/survey/test');
    const res = await GET(req, { params: { slug: 'test' } });
    expect(res.status).toBe(404);
  });
});
