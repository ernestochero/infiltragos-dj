export interface Request {
  id: string;
  songTitle: string;
  artist: string;
  status: string;
  votes: number;
  createdAt: number;
  tableOrName?: string;
  isKaraoke: boolean;
}

/**
 * Finds existing request with same song and artist within time window.
 */
export function findDuplicate(
  list: Request[],
  songTitle: string,
  artist: string,
  windowMs: number
): Request | undefined {
  const now = Date.now();
  return list.find(
    (r) =>
      r.status === "PENDING" &&
      r.songTitle.toLowerCase() === songTitle.toLowerCase() &&
      r.artist.toLowerCase() === artist.toLowerCase() &&
      now - r.createdAt <= windowMs
  );
}
