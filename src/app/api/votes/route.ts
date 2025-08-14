import { NextRequest, NextResponse } from 'next/server';
import { voteSchema } from '@/lib/schemas';
import { rateLimit } from '@/lib/rate-limit';
import { requests } from '@/lib/requests-store';

const votes = new Map<string, Set<string>>();

export async function POST(req: NextRequest) {
  const ip = req.ip ?? '0.0.0.0';
  const body = await req.json();
  const parse = voteSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  if (!rateLimit('vote:' + ip + ':' + parse.data.requestId, 1, 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  }
  const reqObj = requests.find(r => r.id === parse.data.requestId);
  if (!reqObj) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  reqObj.votes += 1;
  let set = votes.get(parse.data.requestId);
  if (!set) { set = new Set(); votes.set(parse.data.requestId, set); }
  set.add(ip);
  return NextResponse.json({ ok: true });
}
