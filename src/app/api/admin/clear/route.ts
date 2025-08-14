import { NextRequest, NextResponse } from 'next/server';
import { requests } from '@/app/api/requests/route';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization');
  if (token !== `Bearer ${ADMIN_TOKEN}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { status } = await req.json();
  for (let i = requests.length - 1; i >= 0; i--) {
    if (requests[i].status === status) {
      requests.splice(i, 1);
    }
  }
  return NextResponse.json({ ok: true });
}
