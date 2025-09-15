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

/** Set bracket linkage for a poll: nextPollId and nextSlot (1 or 2) */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const nextPollId = body?.nextPollId as string | null | undefined;
  const nextSlot = body?.nextSlot as number | null | undefined;
  try {
    const updated = await prisma.poll.update({
      where: { id: params.id },
      data: { nextPollId: nextPollId ?? null, nextSlot: nextSlot ?? null },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('link poll error', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

