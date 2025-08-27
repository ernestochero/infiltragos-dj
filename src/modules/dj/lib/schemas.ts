import { z } from 'zod';
import { RequestStatus } from '@prisma/client';

export const requestSchema = z.object({
  song_title: z.string().min(1).max(100),
  artist: z.string().min(1).max(100),
  table_or_name: z.string().max(100).optional(),
  track_id: z.string().optional(),
  track_uri: z.string().optional(),
});

export const voteSchema = z.object({
  requestId: z.string().cuid(),
});

export const requestStatusSchema = z.object({
  status: z.nativeEnum(RequestStatus),
  sortIndex: z.number().int().optional(),
});

export const reorderSchema = z.object({
  columnStatus: z.nativeEnum(RequestStatus),
  orderedIds: z.array(z.string().cuid()),
});
