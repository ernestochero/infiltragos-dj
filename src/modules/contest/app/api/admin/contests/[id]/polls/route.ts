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

/**
 * Create a poll for a contest
 * Body: { title: string, round?: number, startAt: string, endAt: string, contestantIds: string[] }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== 'string' || !Array.isArray(body.contestantIds)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  try {
    const poll = await prisma.poll.create({
      data: {
        contestId: params.id,
        title: body.title,
        round: body.round ?? 1,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        contestants: { create: (body.contestantIds as string[]).map((id) => ({ contestantId: id })) },
      },
      include: { contestants: true },
    });
    return NextResponse.json(poll, { status: 201 });
  } catch (err) {
    console.error('create poll error', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

