import { z } from 'zod';

export const requestSchema = z.object({
  song_title: z.string().min(1),
  artist: z.string().min(1),
  table_or_name: z.string().optional(),
});

export const voteSchema = z.object({
  requestId: z.string().cuid(),
});
