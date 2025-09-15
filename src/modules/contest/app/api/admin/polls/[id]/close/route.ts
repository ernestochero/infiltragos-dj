import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import type { Poll as PollModel, PollContestant as PollContestantModel } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token');
  const env = process.env.DJ_ADMIN_TOKEN;
  return !!env && token === env;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const poll = (await prisma.poll.findUnique({
    where: { id: params.id },
    include: { contestants: true },
  })) as (PollModel & { contestants: PollContestantModel[] }) | null;
  if (!poll) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Determine winner by highest tally; in tie, pick lowest id (stable)
  const sorted = [...poll.contestants].sort((a, b) => {
    if (b.tally !== a.tally) return b.tally - a.tally;
    return a.id.localeCompare(b.id);
  });
  const winner = sorted[0];
  if (!winner) return NextResponse.json({ error: 'No contestants' }, { status: 400 });

  const now = new Date();
  const updates: Promise<unknown>[] = [];
  // Close poll if still ongoing
  if (poll.endAt > now) {
    updates.push(prisma.poll.update({ where: { id: poll.id }, data: { endAt: now } }));
  }

  let promoted: { nextPollId: string | null; contestantId: string } | null = null;
  if (poll.nextPollId && poll.nextSlot && poll.nextSlot >= 1) {
    // Promote the winner to next poll by creating PollContestant if not present
    updates.push(
      prisma.pollContestant.upsert({
        where: {
          pollId_contestantId: {
            pollId: poll.nextPollId,
            contestantId: winner.contestantId,
          },
        },
        create: { pollId: poll.nextPollId, contestantId: winner.contestantId },
        update: {},
      }),
    );
    promoted = { nextPollId: poll.nextPollId, contestantId: winner.contestantId };
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates as unknown as Parameters<typeof prisma.$transaction>[0]);
  }

  return NextResponse.json({ ok: true, winner: { contestantId: winner.contestantId, tally: winner.tally }, promoted });
}
