import { NextRequest, NextResponse } from 'next/server';
import { searchTracks } from '@dj/lib/spotify';

function isRateLimitError(err: unknown): err is { status: number } {
  return typeof err === 'object' && err !== null && 'status' in err && (err as { status?: number }).status === 429;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.length < 2) {
    return NextResponse.json({ tracks: [] });
  }
  try {
    const tracks = await searchTracks(q);
    return NextResponse.json({ tracks });
  } catch (err: unknown) {
    if (isRateLimitError(err)) {
      return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
    }
    console.error('Spotify search error:', err);
    return NextResponse.json({ error: 'Spotify error' }, { status: 500 });
  }
}
