import { NextRequest, NextResponse } from 'next/server';
import { voteSchema } from '@/lib/schemas';
import { rateLimit } from '@/lib/rate-limit';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const ip = req.ip ?? '0.0.0.0';
  const body = await req.json();
  const parse = voteSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  if (!rateLimit('vote:' + ip + ':' + parse.data.requestId, 1, 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  }

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

  try {
    await prisma.$transaction([
      prisma.vote.create({ data: { requestId: parse.data.requestId, ipHash } }),
      prisma.request.update({
        where: { id: parse.data.requestId },
        data: { votes: { increment: 1 } },
      }),
    ]);
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
