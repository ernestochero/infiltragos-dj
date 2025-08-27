import type { Request } from '@prisma/client';

/**
 * Filters requests updated within the last hour and limits to 10, sorted by most recent.
 */
export function filterRecent(list: Request[]): Request[] {
  const cutoff = Date.now() - 60 * 60 * 1000;
  return list
    .filter((r) => new Date(r.updatedAt).getTime() >= cutoff)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 10);
}

