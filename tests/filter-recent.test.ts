import { describe, it, expect } from 'vitest';
import { filterRecent } from '@dj/lib/filterRecent';
import type { Request } from '@prisma/client';

describe('filterRecent', () => {
  it('returns at most 10 items from the last hour ordered by recency', () => {
    const now = Date.now();
    const make = (minsAgo: number): Request => (
      { id: String(minsAgo), updatedAt: new Date(now - minsAgo * 60_000) } as unknown as Request
    );

    const list: Request[] = Array.from({ length: 12 }, (_, i) => make(i));
    list.push(make(70));

    const result = filterRecent(list);
    expect(result.length).toBe(10);
    expect(result[0].id).toBe('0');
    expect(result.at(-1)?.id).toBe('9');
  });
});

