import { z } from 'zod';

export const requestSchema = z.object({
  song_title: z.string().min(1).max(100),
  artist: z.string().min(1).max(100),
  table_or_name: z.string().max(100).optional(),
});

export const voteSchema = z.object({
  requestId: z.string().cuid(),
});
