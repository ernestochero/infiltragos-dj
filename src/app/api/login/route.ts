import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@core/prisma';
import { signSession, SESSION_COOKIE } from '@core/api/auth';
import { UserRole } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const schema = z.object({
  username: z.string(),
  password: z.string(),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { username, password, rememberMe } = parse.data;
  let user = await prisma.user.findFirst({ where: { name: username } });
  // Dev-friendly: auto-create ADMIN/DJ users if they match env credentials
  if (!user) {
    const envAdmin = process.env.ADMIN_USER || '';
    const envDj = process.env.DJ_ADMIN_USER || '';
    if (username === envAdmin) {
      user = await prisma.user.create({ data: { name: envAdmin, role: UserRole.ADMIN } });
    } else if (username === envDj) {
      user = await prisma.user.create({ data: { name: envDj, role: UserRole.DJ } });
    } else {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
  }

  if (user.role === UserRole.PATRON) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let expectedUser = '';
  let expectedPass = '';
  if (user.role === UserRole.DJ) {
    expectedUser = process.env.DJ_ADMIN_USER || '';
    expectedPass = process.env.DJ_ADMIN_PASSWORD || '';
  } else if (user.role === UserRole.ADMIN) {
    expectedUser = process.env.ADMIN_USER || '';
    expectedPass = process.env.ADMIN_PASSWORD || '';
  }

  if (username !== expectedUser || password !== expectedPass) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const token = signSession({ sub: user.id, role: user.role });
  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12,
  });
  return res;
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
