import { TrackSuggestion } from '@/types/spotify';

let cachedToken: { token: string; expires: number } | null = null;

async function getToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials');
  }
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch Spotify token');
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
}

interface SpotifySearchResponse {
  tracks?: { items: SpotifyTrack[] };
}

export async function searchTracks(query: string): Promise<TrackSuggestion[]> {
  const token = await getToken();
  const market = process.env.SPOTIFY_MARKET || 'US';
  const url = `https://api.spotify.com/v1/search?type=track&limit=5&market=${market}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 429) {
    const err: Error & { status?: number } = new Error('Rate limited');
    err.status = 429;
    throw err;
  }
  if (!res.ok) {
    throw new Error('Spotify search failed');
  }
  const data: SpotifySearchResponse = await res.json();
  const items = data.tracks?.items ?? [];
  return items.map((t) => ({
    id: t.id,
    name: t.name,
    artist: t.artists[0]?.name ?? '',
    uri: t.uri,
  }));
}
