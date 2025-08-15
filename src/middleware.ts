import { NextRequest, NextResponse } from 'next/server';
import { hasAdminCookie } from '@/lib/auth';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith('/admin');
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
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/requests/:path*'],
};
