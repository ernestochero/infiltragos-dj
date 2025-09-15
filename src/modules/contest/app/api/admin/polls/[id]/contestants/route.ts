import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { hasRole } from '@core/api/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token');
  const env = process.env.DJ_ADMIN_TOKEN;
  if (env && token === env) return true;
  return hasRole(req, ['ADMIN']);
}

/** Add one or more contestants to an existing poll */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const contestantIds: string[] | undefined = body?.contestantIds;
  if (!Array.isArray(contestantIds) || contestantIds.length === 0) {
    return NextResponse.json({ error: 'contestantIds required' }, { status: 400 });
  }

  const poll = await prisma.poll.findUnique({ where: { id: params.id } });
  if (!poll) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Ensure all contestants belong to same contest
  const validContestants = await prisma.contestant.findMany({
    where: { id: { in: contestantIds }, contestId: poll.contestId },
    select: { id: true },
  });
  const validIds = validContestants.map(c => c.id);
  if (validIds.length === 0) return NextResponse.json({ error: 'No valid contestants' }, { status: 400 });

  try {
    await prisma.pollContestant.createMany({
      data: validIds.map(id => ({ pollId: poll.id, contestantId: id })),
      skipDuplicates: true,
    });

    const updated = await prisma.poll.findUnique({
      where: { id: poll.id },
      include: { contestants: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('add contestants error', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

/** Remove a contestant from a poll */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const contestantId = url.searchParams.get('contestantId') || (await req.json().catch(() => ({})))?.contestantId;
  if (!contestantId) return NextResponse.json({ error: 'contestantId required' }, { status: 400 });
  try {
    await prisma.pollContestant.deleteMany({ where: { pollId: params.id, contestantId } });
    const updated = await prisma.poll.findUnique({ where: { id: params.id }, include: { contestants: true } });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('remove contestant error', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
