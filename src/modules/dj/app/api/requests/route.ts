import { NextRequest, NextResponse } from 'next/server';
import { requestSchema } from '@dj/lib/schemas';
import { rateLimitByRequest } from '@core/api/rate-limit';
import prisma from '@core/prisma';
import { RequestStatus } from '@prisma/client';

// Runtime y dinámica para evitar static optimization
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const raw = (req.nextUrl.searchParams.get('status') || '').toUpperCase() as RequestStatus;
    const where = Object.values(RequestStatus).includes(raw) ? { status: raw } : {};
    const list = await prisma.request.findMany({
      where,
      orderBy: [
        { sortIndex: 'asc' },
        { createdAt: 'asc' },
      ],
    });
    return NextResponse.json(list);
  } catch (err) {
    console.error('Error fetching requests:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limit = rateLimitByRequest(req, 'req', 1, 2 * 60 * 1000);
  if (!limit.allowed) {
    const retryAfter = Math.ceil(limit.retryAfterMs / 1000);
    return NextResponse.json(
      { error: 'Rate limit', retry_after_seconds: retryAfter },
      { status: 429, headers: { 'Retry-After': retryAfter.toString() } },
    );
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  const parse = requestSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }
  try {
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
  } catch (err) {
    console.error('Error creating request:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
