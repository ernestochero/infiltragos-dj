import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as participate } from '@raffle/app/api/raffles/[id]/participate/route';
import { POST as draw } from '@raffle/app/api/raffles/[id]/draw/route';
import { NextRequest } from 'next/server';
import prisma from '@core/prisma';

vi.mock('@core/prisma', () => ({
  __esModule: true,
  default: {
    raffle: { findUnique: vi.fn() },
    surveyResponse: { create: vi.fn() },
    raffleEntry: { create: vi.fn(), findMany: vi.fn() },
    raffleWinner: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock('@core/api/auth', () => ({
  getSession: vi.fn(() => ({ role: 'ADMIN', sub: '1' })),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mocked = prisma as any;

const raffle = {
  id: 'r1',
  surveyId: 's1',
  isActive: true,
  publicParticipants: true,
  publicDisplayQuestionIds: ['q1'],
  survey: {
    id: 's1',
    questions: [
      { id: 'q1', type: 'PHONE', label: 'Teléfono', order: 0, required: true },
    ],
  },
};

describe('raffle participate', () => {
  beforeEach(() => {
    mocked.raffle.findUnique.mockResolvedValue(raffle);
    mocked.surveyResponse.create.mockResolvedValue({ id: 'sr1' });
    mocked.raffleEntry.create.mockReset();
  });

  it('accepts first participation', async () => {
    mocked.raffleEntry.create.mockResolvedValue({ id: 'e1' });
    const req = new NextRequest('http://localhost/api/raffles/r1/participate', {
      method: 'POST',
      body: JSON.stringify({ answers: { q1: '+51999111222' } }),
      headers: { 'content-type': 'application/json', 'user-agent': 'UA', 'x-forwarded-for': '1.1.1.1' },
    });
    const res = await participate(req, { params: { id: 'r1' } });
    expect(res.status).toBe(201);
  });

  it('blocks same device', async () => {
    mocked.raffleEntry.create.mockRejectedValue({ code: 'P2002', meta: { target: ['ipHash'] } });
    const req = new NextRequest('http://localhost/api/raffles/r1/participate', {
      method: 'POST',
      body: JSON.stringify({ answers: { q1: '+51999111222' } }),
      headers: { 'content-type': 'application/json', 'user-agent': 'UA', 'x-forwarded-for': '1.1.1.1' },
    });
    const res = await participate(req, { params: { id: 'r1' } });
    expect(res.status).toBe(409);
  });

  it('blocks same phone', async () => {
    mocked.raffleEntry.create.mockRejectedValue({ code: 'P2002', meta: { target: ['phoneNorm'] } });
    const req = new NextRequest('http://localhost/api/raffles/r1/participate', {
      method: 'POST',
      body: JSON.stringify({ answers: { q1: '+51999111222' } }),
      headers: { 'content-type': 'application/json', 'user-agent': 'UA', 'x-forwarded-for': '1.1.1.1' },
    });
    const res = await participate(req, { params: { id: 'r1' } });
    expect(res.status).toBe(409);
  });
});

describe('raffle draw', () => {
  beforeEach(() => {
    mocked.raffle.findUnique.mockResolvedValue({ ...raffle, publicDisplayQuestionIds: [] });
    mocked.raffleWinner.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { position: 1, raffleEntryId: 'e1', raffleEntry: { surveyResponse: { answers: { q1: 'A' } } } },
        { position: 2, raffleEntryId: 'e2', raffleEntry: { surveyResponse: { answers: { q1: 'B' } } } },
      ]);
    mocked.raffleEntry.findMany.mockResolvedValue([
      { id: 'e1', surveyResponse: { answers: { q1: 'A' } } },
      { id: 'e2', surveyResponse: { answers: { q1: 'B' } } },
    ]);
    mocked.raffleWinner.aggregate.mockResolvedValue({ _max: { position: null } });
    mocked.raffleWinner.createMany.mockResolvedValue({});
  });

  it('draws winners', async () => {
    const req = new NextRequest('http://localhost/api/raffles/r1/draw', {
      method: 'POST',
      body: JSON.stringify({ count: 2 }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await draw(req, { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.winners).toHaveLength(2);
    expect(mocked.raffleWinner.createMany).toHaveBeenCalled();
  });
});
