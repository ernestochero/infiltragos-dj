import { NextRequest, NextResponse } from 'next/server';

const TOKEN = process.env.DJ_ADMIN_TOKEN;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith('/admin');
  const isRequestMutation =
    pathname.startsWith('/api/requests') && pathname !== '/api/requests' && req.method !== 'GET';

  if (isAdmin || isRequestMutation) {
    const auth = req.headers.get('authorization');
    const cookie = req.cookies.get('dj_admin')?.value;
    if (auth === `Bearer ${TOKEN}` || cookie === TOKEN) {
      return NextResponse.next();
    }
    if (isAdmin) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/requests/:path*'],
};
