import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization');
  if (token !== `Bearer ${ADMIN_TOKEN}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { requestId, status } = await req.json();

  try {
    await prisma.$transaction(async tx => {
      const existing = await tx.request.findUnique({ where: { id: requestId } });
      if (!existing) throw new Error('NOT_FOUND');

      await tx.request.update({ where: { id: requestId }, data: { status } });

      if (status === 'PLAYING') {
        await tx.request.updateMany({
          where: { status: 'PLAYING', NOT: { id: requestId } },
          data: { status: 'DONE' },
        });
      }
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
