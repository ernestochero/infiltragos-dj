import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { RequestStatus } from '@prisma/client';
import { z } from 'zod';

// Runtime y dinámica para evitar static optimization
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const idSchema = z.string().cuid();

// Authorization is enforced by middleware using the admin cookie.

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const idParse = idSchema.safeParse(params.id);
  if (!idParse.success) {
    return NextResponse.json({ error: 'Invalid "id"' }, { status: 400 });
  }
  const id = idParse.data;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });

  const raw = (body.status || '').toString().toUpperCase() as RequestStatus;
  if (!Object.values(RequestStatus).includes(raw)) {
    return NextResponse.json({ error: 'Invalid "status"' }, { status: 400 });
  }
  const sortIndex = typeof body.sortIndex === 'number' ? body.sortIndex : undefined;

  try {
    const updated = await prisma.request.update({
      where: { id },
      data: { status: raw, sortIndex, updatedAt: new Date() },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

// Permitir preflight para evitar abortos del navegador
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'PATCH, GET, OPTIONS',
      'Access-Control-Allow-Methods': 'PATCH, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
