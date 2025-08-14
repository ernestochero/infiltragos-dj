import { NextRequest, NextResponse } from 'next/server';
import { requests } from '@/lib/requests-store';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization');
  if (token !== `Bearer ${ADMIN_TOKEN}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { sourceId, targetId } = await req.json();
  const source = requests.find(r => r.id === sourceId);
  const target = requests.find(r => r.id === targetId);
  if (!source || !target) return NextResponse.json({ error: 'not found' }, { status: 404 });
  target.votes += source.votes;
  const idx = requests.findIndex(r => r.id === sourceId);
  if (idx >= 0) requests.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
