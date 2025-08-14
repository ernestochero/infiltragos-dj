import { NextRequest, NextResponse } from 'next/server';
import { requestSchema } from '@/lib/schemas';
import { rateLimit } from '@/lib/rate-limit';
import prisma from '@/lib/prisma';
import { RequestStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') as RequestStatus | null;
  const where = status ? { status } : {};
  const list = await prisma.request.findMany({ where, orderBy: { createdAt: 'asc' } });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const ip = req.ip ?? '0.0.0.0';
  if (!rateLimit('req:' + ip, 1, 2 * 60 * 1000)) {
    return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  }
  const body = await req.json();
  const parse = requestSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }
  const dup = await prisma.request.findFirst({
    where: {
      songTitle: { equals: parse.data.song_title, mode: 'insensitive' },
      artist: { equals: parse.data.artist, mode: 'insensitive' },
      status: RequestStatus.PENDING,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (dup) {
    await prisma.request.update({
      where: { id: dup.id },
      data: { votes: { increment: 1 } },
    });
    return NextResponse.json({ id: dup.id, duplicate: true });
  }
  const created = await prisma.request.create({
    data: {
      songTitle: parse.data.song_title,
      artist: parse.data.artist,
      tableOrName: parse.data.table_or_name,
    },
  });
  return NextResponse.json({ id: created.id });
}
