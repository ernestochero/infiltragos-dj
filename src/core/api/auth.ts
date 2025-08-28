import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { UserRole } from '@prisma/client';

export const SESSION_COOKIE = 'session';
const secret = process.env.AUTH_SECRET || 'dev_secret';

export interface Session {
  sub: string;
  role: UserRole;
}

function sign(data: string) {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function signSession(payload: Session): string {
  const base = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(base);
  return `${base}.${sig}`;
}

export function verifySession(token: string | undefined): Session | null {
  if (!token) return null;
  const [base, sig] = token.split('.');
  if (!base || !sig) return null;
  const expected = sign(base);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    return JSON.parse(Buffer.from(base, 'base64url').toString()) as Session;
  } catch {
    return null;
  }
}

export function getSession(req: NextRequest): Session | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export function hasRole(req: NextRequest, roles: UserRole[]): boolean {
  const session = getSession(req);
  return !!session && roles.includes(session.role);
}
