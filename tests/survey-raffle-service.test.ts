/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { createSurvey } from '@survey/services/surveyService';
import { createRaffle } from '@survey/services/raffleService';

describe('survey and raffle services', () => {
  it('creates survey without raffle', async () => {
    global.fetch = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 's1' }),
      } as unknown as Response) as unknown as typeof fetch;
    const survey = await createSurvey({ name: 'n', slug: 's', status: 'DRAFT', questions: [] });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/surveys',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(survey.id).toBe('s1');
  });

  it('creates raffle after survey', async () => {
    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 's1' }) } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: { id: 'r1', surveyId: 's1' } }) } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;
    const survey = await createSurvey({ name: 'n', slug: 's', status: 'DRAFT', questions: [] });
    const raffle = await createRaffle({ surveyId: survey.id, publicDisplayQuestionIds: ['q1'] });
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/surveys', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/raffles', expect.objectContaining({ method: 'POST' }));
    expect(raffle.data.surveyId).toBe('s1');
  });

  it('filters publicDisplayQuestionIds to known ids', () => {
    const selected = ['q1', 'q2'];
    const questionIds = ['q1'];
    const filtered = selected.filter(id => questionIds.includes(id));
    expect(filtered).toEqual(['q1']);
  });
});
