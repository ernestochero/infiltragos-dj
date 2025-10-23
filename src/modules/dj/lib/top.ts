import prisma from "@core/prisma";

export interface TopEntry {
  songTitle: string;
  artist: string;
  total: number;
  karaoke: number;
  dj: number;
}

export const WEEKLY_TOP_CACHE_KEY = "dj:top:weekly:v1";
export const WEEKLY_TOP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const HISTORICAL_TOP_CACHE_KEY = "dj:top:historical:v1";
export const HISTORICAL_TOP_TTL_MS = 24 * 60 * 60 * 1000;

interface ComputeTopOptions {
  limit: number;
  since?: Date;
}

async function computeTop({ limit, since }: ComputeTopOptions): Promise<TopEntry[]> {
  const rows = await prisma.request.groupBy({
    by: ["songTitle", "artist", "isKaraoke"],
    where: since
      ? {
          createdAt: {
            gte: since,
          },
        }
      : undefined,
    _sum: {
      votes: true,
    },
    _count: {
      id: true,
    },
  });

  const map = new Map<string, TopEntry>();
  for (const row of rows) {
    const key = `${row.songTitle.toLowerCase()}::${row.artist.toLowerCase()}`;
    const entry =
      map.get(key) ??
      {
        songTitle: row.songTitle,
        artist: row.artist,
        total: 0,
        karaoke: 0,
        dj: 0,
      };
    const votes = row._sum.votes ?? 0;
    const demand = row._count.id + votes;
    if (row.isKaraoke) {
      entry.karaoke += demand;
    } else {
      entry.dj += demand;
    }
    entry.total = entry.karaoke + entry.dj;
    map.set(key, entry);
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function computeWeeklyTop(limit = 10): Promise<TopEntry[]> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return computeTop({ limit, since: cutoff });
}

export function computeHistoricalTop(limit = 30): Promise<TopEntry[]> {
  return computeTop({ limit });
}
