import { z } from 'zod';
import { SurveyUpsertSchema } from '@survey/lib/validation';

export type CreateSurveyInput = z.infer<typeof SurveyUpsertSchema>;

export async function createSurvey(payload: CreateSurveyInput) {
  const data = SurveyUpsertSchema.parse(payload);
  const res = await fetch('/api/surveys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Failed to create survey');
  }
  return (await res.json()) as { id: string };
}
