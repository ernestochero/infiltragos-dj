import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@core/api/auth-edge';

function unauthorized(req: NextRequest, isApi: boolean) {
  if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await getSession(req);

  // Always ensure an anonymous client-id cookie to scope rate limits per device
  const res = NextResponse.next();
  const hasCid = req.cookies.get('cid')?.value;
  if (!hasCid) {
    const gcrypto = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined;
    const cid = gcrypto?.randomUUID
      ? gcrypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
    res.cookies.set('cid', cid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // If the authenticated user is a DJ, restrict access strictly to the DJ module
  // and specific APIs used by that module. Everything else is off-limits.
  if (session?.role === 'DJ') {
    const isApi = pathname.startsWith('/api/');
    const allowedForDJ =
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/dj') ||
      pathname.startsWith('/queue') ||
      pathname.startsWith('/now-playing') ||
      pathname.startsWith('/qr') ||
      pathname.startsWith('/api/requests') ||
      pathname.startsWith('/api/spotify') ||
      pathname.startsWith('/api/lyrics');

    if (!allowedForDJ) {
      // For API calls respond with 401, for pages redirect to DJ dashboard
      if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const dest = pathname.startsWith('/admin') ? '/dj/admin' : '/dj';
      return NextResponse.redirect(new URL(dest, req.url));
    }
  }

  const isDJAdminRoute = pathname.startsWith('/dj/admin');
  const isRequestsRoute = pathname.startsWith('/api/requests');
  const isSurveyAdminRoute = pathname.startsWith('/survey/admin');
  const isSurveyApiRoute = pathname.startsWith('/api/surveys');
  const isAdminRoute = pathname.startsWith('/admin');
  const isPublicRequest =
    isRequestsRoute && pathname === '/api/requests' && ['GET', 'POST'].includes(req.method);

  if (isPublicRequest) {
    return res;
  }

  if (isDJAdminRoute || isRequestsRoute) {
    if (!session || (session.role !== 'DJ' && session.role !== 'ADMIN')) {
      return unauthorized(req, isRequestsRoute);
    }
    return res;
  }

  if (isSurveyAdminRoute || isSurveyApiRoute || isAdminRoute) {
    if (!session || session.role !== 'ADMIN') {
      return unauthorized(req, isSurveyApiRoute);
    }
    return res;
  }

  return res;
}

export const config = {
  // Apply to all application routes, excluding Next internals and static assets
  matcher: [
    '/((?!_next|.*\\..*).*)',
  ],
};
