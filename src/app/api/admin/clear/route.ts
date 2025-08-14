import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization');
  if (token !== `Bearer ${ADMIN_TOKEN}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { status } = await req.json();
  try {
    await prisma.request.deleteMany({ where: { status } });
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
