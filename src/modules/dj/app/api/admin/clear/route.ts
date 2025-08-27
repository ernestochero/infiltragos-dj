import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { RequestStatus } from '@prisma/client';

// Ensure this runs in the Node.js runtime (Prisma is not Edge-compatible)
export const runtime = 'nodejs';

// Prevent static optimization / page-data collection for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || '';
    if (auth !== `Bearer ${ADMIN_TOKEN}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Parse body defensively
    const body = await req.json().catch(() => null) as { status?: string } | null;
    if (!body?.status) {
      return NextResponse.json({ error: 'Missing "status" in body' }, { status: 400 });
    }

    // Validate that provided status matches our Prisma enum
    const candidate = (body.status || '').toUpperCase() as RequestStatus;
    if (!Object.values(RequestStatus).includes(candidate)) {
      return NextResponse.json({ error: 'Invalid "status" value' }, { status: 400 });
    }

    await prisma.request.deleteMany({ where: { status: candidate } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Avoid leaking errors during build/collect; return a clean 500
    return NextResponse.json({ error: 'Database error: ' + (err instanceof Error ? err.message : 'Unknown error') }, { status: 500 });
  }
}

// Optionally reject other methods to be explicit
export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
