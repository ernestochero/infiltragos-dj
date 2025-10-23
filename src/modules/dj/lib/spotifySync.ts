"use server";

import type { TopEntry } from "./top";

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SyncResult {
  attempted: number;
  matched: number;
  missing: number;
  skipped: boolean;
  reason?: string;
  missingSongs?: Array<{ songTitle: string; artist: string }>;
}

let cachedToken:
  | { token: string; expiresAt: number }
  | null = null;

async function getSpotifyToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    console.error("Spotify token error:", await res.text());
    return null;
  }
  const json = (await res.json()) as SpotifyTokenResponse;
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.token;
}

async function findTrackUri(
  token: string,
  songTitle: string,
  artist: string
): Promise<string | null> {
  const query = encodeURIComponent(
    `track:${songTitle} artist:${artist}`.replace(/\s+/g, " ")
  );
  const res = await fetch(
    `https://api.spotify.com/v1/search?type=track&limit=3&q=${query}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    console.error("Spotify search error:", await res.text());
    return null;
  }
  const json = (await res.json()) as {
    tracks?: { items?: Array<{ uri: string }> };
  };
  const items = json.tracks?.items ?? [];
  return items[0]?.uri ?? null;
}

async function replacePlaylistTracks(
  token: string,
  playlistId: string,
  uris: string[]
) {
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris }),
    }
  );
  if (!res.ok) {
    throw new Error(
      `Spotify playlist update failed: ${res.status} ${await res.text()}`
    );
  }
}

export async function syncHistoricalPlaylist(
  entries: TopEntry[]
): Promise<SyncResult> {
  const playlistId = process.env.TOP_HISTORICAL_PLAYLIST_ID;
  if (!playlistId) {
    return {
      attempted: 0,
      matched: 0,
      missing: 0,
      skipped: true,
      reason: "TOP_HISTORICAL_PLAYLIST_ID not configured",
    };
  }
  const token = await getSpotifyToken();
  if (!token) {
    return {
      attempted: 0,
      matched: 0,
      missing: entries.length,
      skipped: true,
      reason:
        "Spotify credentials or refresh token not configured; cannot update playlist",
    };
  }

  const missing: Array<{ songTitle: string; artist: string }> = [];
  const uris: string[] = [];
  // Perform all track URI lookups in parallel
  const uriResults = await Promise.all(
    entries.map(entry => findTrackUri(token, entry.songTitle, entry.artist))
  );
  for (let i = 0; i < entries.length; i++) {
    const uri = uriResults[i];
    if (uri) {
      uris.push(uri);
    } else {
      missing.push({ songTitle: entries[i].songTitle, artist: entries[i].artist });
    }
  }

  try {
    if (uris.length > 0) {
      await replacePlaylistTracks(token, playlistId, uris);
    }
  } catch (err) {
    console.error("Error syncing Spotify playlist:", err);
    return {
      attempted: entries.length,
      matched: uris.length,
      missing: entries.length - uris.length,
      skipped: true,
      reason: "Failed to update playlist",
      missingSongs: missing,
    };
  }

  return {
    attempted: entries.length,
    matched: uris.length,
    missing: entries.length - uris.length,
    skipped: false,
    missingSongs: missing,
  };
}
