import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { RequestStatus } from '@prisma/client';

// Asegura runtime Node.js y evita optimización estática
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization') || '';
    if (token !== `Bearer ${ADMIN_TOKEN}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Parseo defensivo
    const body = (await req.json().catch(() => null)) as
      | { requestId?: string; status?: string }
      | null;

    const requestId = body?.requestId?.trim();
    const rawStatus = body?.status?.toUpperCase();

    if (!requestId || !rawStatus) {
      return NextResponse.json({ error: 'Missing "requestId" or "status"' }, { status: 400 });
    }

    // Validar contra enum de Prisma
    const candidate = rawStatus as RequestStatus;
    if (!Object.values(RequestStatus).includes(candidate)) {
      return NextResponse.json({ error: 'Invalid "status" value' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.request.findUnique({ where: { id: requestId } });
      if (!existing) throw new Error('NOT_FOUND');

      if (candidate === 'PLAYING') {
        // Primero, cerrar cualquier PLAYING anterior (excepto el actual)
        await tx.request.updateMany({
          where: { status: 'PLAYING', NOT: { id: requestId } },
          data: { status: 'DONE' },
        });
      }

      // Luego, actualizar el actual al estado solicitado
      await tx.request.update({
        where: { id: requestId },
        data: { status: candidate },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

// Bloquear GET explícitamente
export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
