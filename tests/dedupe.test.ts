import { describe, it, expect } from 'vitest';
import { findDuplicate, Request } from '@dj/lib/dedupe';

describe('findDuplicate', () => {
  it('finds duplicate within window', () => {
    const list: Request[] = [{ id: '1', songTitle: 'A', artist: 'B', status: 'PENDING', votes: 0, createdAt: Date.now() }];
    const dup = findDuplicate(list, 'A', 'B', 60_000);
    expect(dup).toBeDefined();
  });
});
