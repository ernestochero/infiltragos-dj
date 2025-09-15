import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@core/api/auth-edge';

function unauthorized(req: NextRequest, isApi: boolean) {
  if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Deja pasar preflights para evitar 405 antes del handler
  if (req.method === 'OPTIONS') {
    return NextResponse.next();
  }
  const session = await getSession(req);

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
      pathname.startsWith('/api/spotify');

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
    return NextResponse.next();
  }

  if (isDJAdminRoute || isRequestsRoute) {
    if (!session || (session.role !== 'DJ' && session.role !== 'ADMIN')) {
      return unauthorized(req, isRequestsRoute);
    }
    return NextResponse.next();
  }

  if (isSurveyAdminRoute || isSurveyApiRoute || isAdminRoute) {
    if (!session || session.role !== 'ADMIN') {
      return unauthorized(req, isSurveyApiRoute);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Apply to all application routes, excluding Next internals and static assets
  matcher: [
    '/((?!_next|.*\\..*).*)',
  ],
};
