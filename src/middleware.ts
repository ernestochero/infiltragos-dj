import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@core/api/auth-edge';

function unauthorized(req: NextRequest, isApi: boolean) {
  if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await getSession(req);

  const isDJRoute = pathname.startsWith('/dj');
  const isRequestsRoute = pathname.startsWith('/api/requests');
  const isSurveyAdminRoute = pathname.startsWith('/survey/admin');
  const isSurveyApiRoute = pathname.startsWith('/api/surveys');
  const isAdminRoute = pathname.startsWith('/admin');
  const isPublicRequest =
    isRequestsRoute && pathname === '/api/requests' && ['GET', 'POST'].includes(req.method);

  if (isPublicRequest) {
    return NextResponse.next();
  }

  if (isDJRoute || isRequestsRoute) {
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
  matcher: [
    '/dj/:path*',
    '/api/requests/:path*',
    '/survey/admin/:path*',
    '/api/surveys/:path*',
    '/admin/:path*',
  ],
};
