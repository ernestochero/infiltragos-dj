import { NextResponse } from 'next/server';

// Runtime y dinámica para evitar static optimization
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: 'dj_admin',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
