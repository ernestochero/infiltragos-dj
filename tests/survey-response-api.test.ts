// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@survey/app/api/surveys/[id]/responses/route';
import { NextRequest } from 'next/server';
import { resetRateLimit } from '@survey/lib/rate-limit';
import prisma from '@core/prisma';
vi.mock('@core/prisma', () => ({
  __esModule: true,
  default: {
    survey: { findUnique: vi.fn() },
    surveyResponse: { create: vi.fn() },
  },
}));
const mocked = prisma as unknown as {
  survey: { findUnique: any };
  surveyResponse: { create: any };
};

const survey = {
  id: 's1',
  status: 'PUBLISHED',
  questions: [
    { id: 'q1', type: 'SHORT_TEXT', label: 'Name', order: 0, required: true },
  ],
};

describe('POST /api/surveys/[id]/responses', () => {
  beforeEach(() => {
    resetRateLimit();
    (mocked.survey.findUnique as any).mockReset();
    (mocked.surveyResponse.create as any).mockReset();
  });

  it('accepts valid payload', async () => {
    (mocked.survey.findUnique as any).mockResolvedValue(survey);
    const req = new NextRequest('http://localhost/api/surveys/s1/responses', {
      method: 'POST',
      body: JSON.stringify({ answers: { q1: 'John' } }),
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.1.1.1' },
    });
    const res = await POST(req, { params: { id: 's1' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
      expect((mocked.surveyResponse.create as any)).toHaveBeenCalled();
  });

  it('rejects invalid payload', async () => {
    (mocked.survey.findUnique as any).mockResolvedValue(survey);
    const req = new NextRequest('http://localhost/api/surveys/s1/responses', {
      method: 'POST',
      body: JSON.stringify({ answers: { q1: '' } }),
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.1.1.1' },
    });
    const res = await POST(req, { params: { id: 's1' } });
    expect(res.status).toBe(422);
  });

  it('applies rate limiting', async () => {
    (mocked.survey.findUnique as any).mockResolvedValue(survey);
    const req1 = new NextRequest('http://localhost/api/surveys/s1/responses', {
      method: 'POST',
      body: JSON.stringify({ answers: { q1: 'John' } }),
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '2.2.2.2' },
    });
    const req2 = new NextRequest('http://localhost/api/surveys/s1/responses', {
      method: 'POST',
      body: JSON.stringify({ answers: { q1: 'John' } }),
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '2.2.2.2' },
    });
    await POST(req1, { params: { id: 's1' } });
    const res2 = await POST(req2, { params: { id: 's1' } });
    expect(res2.status).toBe(429);
  });
});
