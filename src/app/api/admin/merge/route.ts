import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization');
  if (token !== `Bearer ${ADMIN_TOKEN}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { sourceId, targetId } = await req.json();
  try {
    await prisma.$transaction(async tx => {
      const source = await tx.request.findUnique({ where: { id: sourceId } });
      const target = await tx.request.findUnique({ where: { id: targetId } });
      if (!source || !target) throw new Error('NOT_FOUND');

      await tx.request.update({
        where: { id: targetId },
        data: { votes: { increment: source.votes } },
      });
      await tx.vote.updateMany({ where: { requestId: sourceId }, data: { requestId: targetId } });
      await tx.request.delete({ where: { id: sourceId } });
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
