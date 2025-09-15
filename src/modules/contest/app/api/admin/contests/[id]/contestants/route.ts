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

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

// Create a new contestant within a contest
// Body: { name: string, slug?: string, photoUrl?: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const name: string | undefined = body?.name;
  const photoUrl: string | undefined = body?.photoUrl;
  const slug: string | undefined = body?.slug || (name ? slugify(name) : undefined);
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  try {
    const contestant = await prisma.contestant.create({
      data: {
        contestId: params.id,
        name,
        slug: slug!,
        photoUrl: photoUrl ?? null,
      },
    });
    return NextResponse.json(contestant, { status: 201 });
  } catch (err) {
    console.error('create contestant error', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
