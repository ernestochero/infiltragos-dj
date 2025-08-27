import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { RequestStatus } from '@prisma/client';

// Runtime y dinámica para evitar static optimization
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Authorization is enforced by middleware using the admin cookie.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });

  const rawStatus = (body.columnStatus || '').toString().toUpperCase() as RequestStatus;
  if (!Object.values(RequestStatus).includes(rawStatus)) {
    return NextResponse.json({ error: 'Invalid "columnStatus"' }, { status: 400 });
  }
  const orderedIds = Array.isArray(body.orderedIds)
    ? (body.orderedIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : null;
  if (!orderedIds || orderedIds.length === 0) {
    return NextResponse.json({ error: 'Invalid "orderedIds"' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const [index, id] of orderedIds.entries()) {
        await tx.request.updateMany({
          where: { id, status: rawStatus },
          data: { sortIndex: index, updatedAt: new Date() },
        });
      }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
