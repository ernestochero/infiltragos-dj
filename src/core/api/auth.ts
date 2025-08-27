import { NextRequest } from 'next/server';

export const ADMIN_COOKIE = 'dj_admin';

export function hasAdminCookie(req: NextRequest): boolean {
  return req.cookies.get(ADMIN_COOKIE)?.value === '1';
}
