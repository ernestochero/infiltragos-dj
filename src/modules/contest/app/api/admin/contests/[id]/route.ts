import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { hasRole } from '@core/api/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token');
  const env = process.env.DJ_ADMIN_TOKEN;
  if (env && token === env) return true;
  return hasRole(req, ['ADMIN']);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const contest = await prisma.contest.findUnique({
    where: { id: params.id },
    include: {
      contestants: { orderBy: { name: 'asc' } },
      polls: {
        orderBy: [{ round: 'asc' }, { startAt: 'asc' }],
        include: { contestants: true },
      },
    },
  });
  if (!contest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(contest);
}

