import { NextRequest, NextResponse } from 'next/server';
import { requestSchema } from '@/lib/schemas';
import { findDuplicate, Request } from '@/lib/dedupe';
import { rateLimit } from '@/lib/rate-limit';
import { requests } from '@/lib/requests-store';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');
  const list = status ? requests.filter(r => r.status === status) : requests;
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
  const dup = findDuplicate(requests, parse.data.song_title, parse.data.artist, 60 * 60 * 1000);
  if (dup) {
    dup.votes += 1;
    return NextResponse.json({ id: dup.id, duplicate: true });
  }
  const id = crypto.randomUUID();
  const newReq: Request = {
    id,
    songTitle: parse.data.song_title,
    artist: parse.data.artist,
    tableOrName: parse.data.table_or_name,
    status: 'PENDING',
    votes: 0,
    createdAt: Date.now(),
  };
  requests.push(newReq);
  return NextResponse.json({ id });
}
