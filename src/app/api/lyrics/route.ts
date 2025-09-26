import { NextRequest, NextResponse } from 'next/server';
import { rateLimitByRequest } from '@core/api/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const started = Date.now();
  const artist = req.nextUrl.searchParams.get('artist')?.trim() || '';
  const title = req.nextUrl.searchParams.get('title')?.trim() || '';

  if (!artist || !title) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const limit = rateLimitByRequest(req, 'lyrics', 10, 60_000);
  if (!limit.allowed) {
    const retryAfter = Math.ceil(limit.retryAfterMs / 1000);
    return NextResponse.json(
      { error: 'Rate limit', retry_after_seconds: retryAfter },
      { status: 429, headers: { 'Retry-After': retryAfter.toString() } },
    );
  }

  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const upstream = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await upstream.json().catch(() => ({ error: 'bad-json' }));
    const status = upstream.ok ? 200 : 502;
    const res = NextResponse.json(data, { status });
    if (status === 200) {
      res.headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    } else {
      res.headers.set('Cache-Control', 'no-store');
    }
    return res;
  } catch (err) {
    console.error('Lyrics upstream error:', err);
    return NextResponse.json({ error: 'Lyrics error' }, { status: 502 });
  } finally {
    const ms = Date.now() - started;
    // Keep a simple trace for visibility in server logs
    console.info(`GET /api/lyrics ${artist} - ${title} in ${ms}ms`);
  }
}
