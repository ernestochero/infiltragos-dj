import { describe, it, expect } from 'vitest';
import { requestSchema } from '../src/lib/schemas';

describe('requestSchema', () => {
  it('validates data', () => {
    const result = requestSchema.safeParse({ song_title: 'x', artist: 'y' });
    expect(result.success).toBe(true);
  });

  it('accepts optional track fields', () => {
    const result = requestSchema.safeParse({ song_title: 'x', artist: 'y', track_id: '1', track_uri: 'uri' });
    expect(result.success).toBe(true);
  });
});
