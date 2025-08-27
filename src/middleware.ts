import { NextRequest, NextResponse } from 'next/server';
import { hasAdminCookie } from '@core/api/auth';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith('/dj/admin');
  const isRequestsRoute = pathname.startsWith('/api/requests');
  const isPublicRequest =
    isRequestsRoute && pathname === '/api/requests' && ['GET', 'POST'].includes(req.method);

  if (isPublicRequest) {
    return NextResponse.next();
  }

  if (isAdminRoute || isRequestsRoute) {
    if (hasAdminCookie(req)) {
      return NextResponse.next();
    }
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/dj/login', req.url));
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dj/admin', '/dj/admin/:path*', '/api/requests/:path*'],
};
