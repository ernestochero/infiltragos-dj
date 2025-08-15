import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  username: z.string(),
  password: z.string(),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { username, password, rememberMe } = parse.data;
  const user = process.env.DJ_ADMIN_USER;
  const pass = process.env.DJ_ADMIN_PASSWORD;
  if (username !== user || password !== pass) {
    return NextResponse.json(
      { error: 'Invalid username or password' },
      { status: 401 },
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: 'dj_admin',
    value: '1',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12,
  });
  return res;
}
