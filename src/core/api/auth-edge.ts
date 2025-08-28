import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';

export const SESSION_COOKIE = 'session';
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev_secret');

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4 ? 4 - (str.length % 4) : 0;
  const s = atob(str + '='.repeat(pad));
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

export interface Session {
  sub: string;
  role: UserRole;
}

export async function getSession(req: NextRequest): Promise<Session | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [base, sig] = token.split('.');
  if (!base || !sig) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    base64urlDecode(sig),
    new TextEncoder().encode(base),
  );
  if (!ok) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64urlDecode(base))) as Session;
    return data;
  } catch {
    return null;
  }
}
