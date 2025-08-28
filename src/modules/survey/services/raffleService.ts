import { z } from 'zod';

export const RaffleCreateSchema = z.object({
  surveyId: z.string(),
  isActive: z.boolean().optional(),
  publicParticipants: z.boolean().optional(),
  publicDisplayQuestionIds: z.array(z.string()).optional(),
});

export type CreateRaffleInput = z.infer<typeof RaffleCreateSchema>;

export async function createRaffle(payload: CreateRaffleInput) {
  const data = RaffleCreateSchema.parse(payload);
  const res = await fetch('/api/raffles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Failed to create raffle');
  }
  return (await res.json()) as { data: { id: string; surveyId: string } };
}
