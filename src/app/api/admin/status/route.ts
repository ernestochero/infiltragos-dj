import { NextRequest, NextResponse } from 'next/server';
import { requests } from '@/lib/requests-store';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization');
  if (token !== `Bearer ${ADMIN_TOKEN}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { requestId, status } = await req.json();
  const reqObj = requests.find(r => r.id === requestId);
  if (!reqObj) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  reqObj.status = status;
  if (status === 'PLAYING') {
    requests.forEach(r => {
      if (r.id !== requestId && r.status === 'PLAYING') r.status = 'DONE';
    });
  }
  return NextResponse.json({ ok: true });
}
