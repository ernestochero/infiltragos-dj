import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';

// Ensure Node.js runtime (Prisma is not Edge-compatible)
export const runtime = 'nodejs';

// Prevent static optimization / page-data collection for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization') || '';
    if (token !== `Bearer ${ADMIN_TOKEN}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null) as { sourceId?: string; targetId?: string } | null;
    const sourceId = body?.sourceId?.trim();
    const targetId = body?.targetId?.trim();

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'Missing "sourceId" or "targetId"' }, { status: 400 });
    }
    if (sourceId === targetId) {
      return NextResponse.json({ error: '"sourceId" and "targetId" must be different' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const source = await tx.request.findUnique({ where: { id: sourceId } });
      const target = await tx.request.findUnique({ where: { id: targetId } });

      if (!source || !target) {
        throw new Error('NOT_FOUND');
      }

      // Merge votes
      await tx.request.update({
        where: { id: targetId },
        data: { votes: { increment: source.votes } },
      });

      // Re-point votes to the target request
      await tx.vote.updateMany({
        where: { requestId: sourceId },
        data: { requestId: targetId },
      });

      // Remove source request
      await tx.request.delete({ where: { id: sourceId } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    // Avoid leaking stack traces during build/collect
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
