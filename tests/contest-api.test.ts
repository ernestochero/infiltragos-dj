import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as getPoll } from '@/modules/contest/app/api/polls/[id]/route';
import { POST as votePoll } from '@/modules/contest/app/api/polls/[id]/vote/route';
import { getPollStatus } from '@/modules/contest/lib/utils';
import { NextRequest } from 'next/server';
import prisma from '@core/prisma';

vi.mock('@core/prisma', () => ({
  __esModule: true,
  default: {
    poll: { findUnique: vi.fn() },
    pollVote: { findFirst: vi.fn(), create: vi.fn() },
    pollContestant: { update: vi.fn() },
    $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mocked = prisma as any;

describe('getPollStatus', () => {
  it('returns upcoming/active/finished correctly', () => {
    const now = new Date('2025-01-01T12:00:00Z');
    const start = new Date('2025-01-01T13:00:00Z');
    const end = new Date('2025-01-01T14:00:00Z');
    expect(getPollStatus(now, start, end)).toBe('upcoming');
    expect(getPollStatus(new Date('2025-01-01T13:00:00Z'), start, end)).toBe('active');
    expect(getPollStatus(new Date('2025-01-01T15:00:00Z'), start, end)).toBe('finished');
  });
});

describe('GET /api/polls/[id]', () => {
  beforeEach(() => {
    mocked.poll.findUnique.mockReset();
    mocked.pollVote.findFirst.mockReset();
  });

  it('returns poll data with tallies and hasVoted=false', async () => {
    mocked.poll.findUnique.mockResolvedValue({
      id: 'p1',
      contestId: 'c1',
      title: 'Match 1',
      round: 1,
      startAt: new Date(Date.now() - 1000),
      endAt: new Date(Date.now() + 3600000),
      contestants: [
        { id: 'pc1', pollId: 'p1', contestantId: 'a', tally: 10, contestant: { name: 'A', slug: 'a', photoUrl: null } },
        { id: 'pc2', pollId: 'p1', contestantId: 'b', tally: 5, contestant: { name: 'B', slug: 'b', photoUrl: null } },
      ],
      contest: { id: 'c1' },
    });
    mocked.pollVote.findFirst.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/polls/p1', {
      headers: { 'user-agent': 'UA', 'x-forwarded-for': '1.1.1.1' },
    });
    const res = await getPoll(req, { params: { id: 'p1' } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(2);
    expect(json.hasVoted).toBe(false);
    expect(json.status).toBe('active');
  });
});

describe('POST /api/polls/[id]/vote', () => {
  beforeEach(() => {
    mocked.poll.findUnique.mockReset();
    mocked.pollVote.findFirst.mockReset();
    mocked.pollVote.create.mockReset();
    mocked.pollContestant.update.mockReset();
  });

  it('accepts first vote and increments tally', async () => {
    mocked.poll.findUnique.mockResolvedValue({
      id: 'p1',
      contestId: 'c1',
      title: 'Match 1',
      round: 1,
      startAt: new Date(Date.now() - 1000),
      endAt: new Date(Date.now() + 3600000),
      contestants: [{ id: 'pc1', pollId: 'p1', contestantId: 'a', tally: 10 }],
    });
    mocked.pollVote.findFirst.mockResolvedValue(null);
    mocked.pollVote.create.mockResolvedValue({ id: 'v1' });
    mocked.pollContestant.update.mockResolvedValue({ id: 'pc1', tally: 11 });
    const req = new NextRequest('http://localhost/api/polls/p1/vote', {
      method: 'POST',
      body: JSON.stringify({ contestantId: 'a' }),
      headers: { 'content-type': 'application/json', 'user-agent': 'UA', 'x-forwarded-for': '1.1.1.1' },
    });
    const res = await votePoll(req, { params: { id: 'p1' } });
    expect(res.status).toBe(200);
    expect(mocked.pollContestant.update).toHaveBeenCalled();
  });

  it('blocks duplicate vote', async () => {
    mocked.poll.findUnique.mockResolvedValue({
      id: 'p1',
      contestId: 'c1',
      title: 'Match 1',
      round: 1,
      startAt: new Date(Date.now() - 1000),
      endAt: new Date(Date.now() + 3600000),
      contestants: [{ id: 'pc1', pollId: 'p1', contestantId: 'a', tally: 10 }],
    });
    mocked.pollVote.findFirst.mockResolvedValue({ id: 'v1' });
    const req = new NextRequest('http://localhost/api/polls/p1/vote', {
      method: 'POST',
      body: JSON.stringify({ contestantId: 'a' }),
      headers: { 'content-type': 'application/json', 'user-agent': 'UA', 'x-forwarded-for': '1.1.1.1' },
    });
    const res = await votePoll(req, { params: { id: 'p1' } });
    expect(res.status).toBe(409);
  });
});
