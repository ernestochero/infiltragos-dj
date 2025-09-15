import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import type { Contestant } from '@prisma/client';
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  const data: Partial<Pick<Contestant, 'name' | 'slug' | 'photoUrl'>> = {};
  if (typeof body.name === 'string') data.name = body.name;
  if (typeof body.slug === 'string') data.slug = body.slug || slugify(body.name || '');
  if (typeof body.photoUrl === 'string') data.photoUrl = body.photoUrl || null;
  try {
    const updated = await prisma.contestant.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('update contestant error', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
