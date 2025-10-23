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

export async function computeWeeklyTop(limit = 10): Promise<TopEntry[]> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await prisma.request.groupBy({
    by: ["songTitle", "artist", "isKaraoke"],
    where: {
      createdAt: {
        gte: cutoff,
      },
    },
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
