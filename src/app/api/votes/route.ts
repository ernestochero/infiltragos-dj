import { NextRequest, NextResponse } from 'next/server';
import { voteSchema } from '@dj/lib/schemas';
import { rateLimit } from '@core/api/rate-limit';
import prisma from '@core/prisma';
import crypto from 'crypto';

// Runtime y dinámica para evitar static optimization
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const ip = req.ip ?? '0.0.0.0';
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  const parse = voteSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  const limit = rateLimit('vote:' + ip + ':' + parse.data.requestId, 1, 24 * 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  }

  try {
    const reqObj = await prisma.request.findUnique({ where: { id: parse.data.requestId } });
    if (!reqObj) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    const existing = await prisma.vote.findFirst({
      where: {
        requestId: parse.data.requestId,
        ipHash,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
    }

    await prisma.$transaction([
      prisma.vote.create({ data: { requestId: parse.data.requestId, ipHash } }),
      prisma.request.update({
        where: { id: parse.data.requestId },
        data: { votes: { increment: 1 } },
      }),
    ]);
  } catch (err) {
    console.error('Error creating vote:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
