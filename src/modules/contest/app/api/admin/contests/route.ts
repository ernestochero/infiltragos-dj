import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import type { Prisma } from '@prisma/client';
import { hasRole } from '@core/api/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token');
  const env = process.env.DJ_ADMIN_TOKEN;
  if (env && token === env) return true;
  // Also allow authenticated ADMIN via session cookie
  return hasRole(req, ['ADMIN']);
}

/**
 * Create a contest with contestants and a first poll.
 * Body: {
 *   title: string,
 *   description?: string,
 *   contestants: { name: string, slug: string, photoUrl?: string }[],
 *   poll?: { title: string, round?: number, startAt: string, endAt: string, contestantSlugs: string[] }
 * }
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const contestants = (Array.isArray(body.contestants) ? body.contestants : []) as { name: string; slug: string; photoUrl?: string }[];
  const participantsCount = Number.isInteger(body?.participantsCount) ? (body.participantsCount as number) : undefined;
  const matchSize = Number.isInteger(body?.matchSize) ? (body.matchSize as number) : undefined;
  const pollInput = body.poll as
    | { title: string; round?: number; startAt: string; endAt: string; contestantSlugs: string[] }
    | undefined;

  try {
    const contest = await prisma.contest.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        contestants: {
          create: contestants.map((c) => ({ name: c.name, slug: c.slug, photoUrl: c.photoUrl })),
        },
      },
      include: { contestants: true },
    });

    let poll = null;
    if (pollInput) {
      const map = new Map(contest.contestants.map((c) => [c.slug, c.id] as const));
      const ids = pollInput.contestantSlugs.map((s) => map.get(s)).filter(Boolean) as string[];
      poll = await prisma.poll.create({
        data: {
          contestId: contest.id,
          title: pollInput.title,
          round: pollInput.round ?? 1,
          startAt: new Date(pollInput.startAt),
          endAt: new Date(pollInput.endAt),
          contestants: {
            create: ids.map((id) => ({ contestantId: id })),
          },
        },
        include: { contestants: true },
      });
    }

    // Bracket scaffolding mode
    if (!pollInput && participantsCount && matchSize && participantsCount >= matchSize && matchSize >= 2) {
      // Build bracket counts per round: starting from first round until final
      const counts: number[] = [];
      let current = Math.ceil(participantsCount / matchSize);
      while (current > 1) {
        counts.push(current);
        current = Math.ceil(current / matchSize);
      }
      counts.push(1); // final

      // Create polls from last round to first, keep ids by round
      const rounds: string[][] = [];
      const now = Date.now();
      for (let r = counts.length - 1; r >= 0; r--) {
        const roundIndex = r + 1; // 1-based for UX
        const num = counts[r];
        const ids: string[] = [];
        for (let i = 0; i < num; i++) {
          const start = new Date(now + roundIndex * 60 * 60 * 1000); // +N hours
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          const created = await prisma.poll.create({
            data: {
              contestId: contest.id,
              title: `Ronda ${roundIndex} · Match ${i + 1}`,
              round: roundIndex,
              startAt: start,
              endAt: end,
            },
          });
          ids.push(created.id);
        }
        rounds.unshift(ids); // push front so rounds[0] is round 1 at the end
      }

      // Link polls from earlier rounds to next rounds
      for (let r = 0; r < rounds.length - 1; r++) {
        const thisRound = rounds[r];
        const nextRound = rounds[r + 1];
        for (let i = 0; i < thisRound.length; i++) {
          const targetIndex = Math.floor(i / matchSize);
          const slot = (i % matchSize) + 1; // 1..matchSize
          await prisma.poll.update({
            where: { id: thisRound[i] },
            data: { nextPollId: nextRound[targetIndex], nextSlot: slot },
          });
        }
      }
    }

    return NextResponse.json({ contest, poll }, { status: 201 });
  } catch (err) {
    console.error('contest create error', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Prisma.ContestWhereInput = {};
  if (q) where.title = { contains: q, mode: 'insensitive' };
  if (from || to) {
    where.updatedAt = {};
    if (from) where.updatedAt.gte = new Date(from);
    if (to) where.updatedAt.lte = new Date(to);
  }

  const contests = await prisma.contest.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { contestants: true, polls: true } },
    },
  });
  return NextResponse.json({ items: contests });
}
