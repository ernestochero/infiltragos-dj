import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { buildVoteHashes, getPollStatus, getTimeRemainingMs } from '@/modules/contest/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    include: {
      contestants: {
        include: { contestant: true },
        orderBy: { id: 'asc' },
      },
      contest: true,
    },
  });
  if (!poll) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const now = new Date();
  const status = getPollStatus(now, poll.startAt, poll.endAt);
  const timeRemaining = getTimeRemainingMs(now, poll.endAt);

  const hashes = buildVoteHashes(req);
  const voted = await prisma.pollVote.findFirst({
    where: {
      pollId: poll.id,
      OR: [
        { ipHash: hashes.ipHash },
        ...(hashes.voterFingerprintHash ? [{ voterFingerprintHash: hashes.voterFingerprintHash }] : []),
      ],
    },
    select: { id: true },
  });

  const items = poll.contestants.map((pc) => ({
    pollContestantId: pc.id,
    contestantId: pc.contestantId,
    name: pc.contestant.name,
    slug: pc.contestant.slug,
    photoUrl: pc.contestant.photoUrl,
    tally: pc.tally,
  }));

  return NextResponse.json({
    id: poll.id,
    contestId: poll.contestId,
    title: poll.title,
    round: poll.round,
    startAt: poll.startAt,
    endAt: poll.endAt,
    status,
    timeRemaining,
    hasVoted: !!voted,
    items,
  });
}
