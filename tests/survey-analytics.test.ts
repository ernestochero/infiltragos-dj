import { describe, expect, it } from 'vitest';
import { buildSurveyAnalytics } from '@survey/lib/analytics';
import type { Question } from '@survey/lib/validation';

describe('survey analytics', () => {
  const questions: Question[] = [
    {
      id: 'q1',
      type: 'SINGLE_CHOICE',
      label: 'Color?',
      order: 1,
      required: false,
      options: [
        { id: 'o1', label: 'Rojo', value: 'red', order: 1 },
        { id: 'o2', label: 'Azul', value: 'blue', order: 2 },
      ],
    },
    {
      id: 'q2',
      type: 'MULTIPLE_CHOICE',
      label: 'Frutas?',
      order: 2,
       required: false,
      options: [
        { id: 'o3', label: 'Manzana', value: 'apple', order: 1 },
        { id: 'o4', label: 'Plátano', value: 'banana', order: 2 },
        { id: 'o5', label: 'Naranja', value: 'orange', order: 3 },
      ],
    },
    {
      id: 'q3',
      type: 'SHORT_TEXT',
      label: 'Comentario',
      order: 3,
      required: false,
    },
  ];

  const responses = [
    { answers: { q1: 'red', q2: ['apple', 'orange'], q3: 'hola mundo' } },
    { answers: { q1: 'blue', q2: ['banana'], q3: 'hola' } },
    { answers: { q1: 'red', q2: [], q3: 'adios' } },
    { answers: { q1: 'red', q2: ['apple'], q3: 'hola' } },
  ];

  const analytics = buildSurveyAnalytics(questions, responses);

  it('counts single choice correctly', () => {
    const q1 = analytics.find(a => a.id === 'q1') as Extract<
      typeof analytics[number],
      { type: 'SINGLE_CHOICE' }
    >;
    expect(q1).toBeDefined();
    expect(q1.counts.find(c => c.value === 'red')?.count).toBe(3);
    expect(q1.counts.find(c => c.value === 'blue')?.count).toBe(1);
  });

  it('counts multiple choice correctly', () => {
    const q2 = analytics.find(a => a.id === 'q2') as Extract<
      typeof analytics[number],
      { type: 'MULTIPLE_CHOICE' }
    >;
    expect(q2).toBeDefined();
    expect(q2.counts.find(c => c.value === 'apple')?.count).toBe(2);
    expect(q2.counts.find(c => c.value === 'banana')?.count).toBe(1);
    expect(q2.counts.find(c => c.value === 'orange')?.count).toBe(1);
  });

  it('computes top texts', () => {
    const q3 = analytics.find(a => a.id === 'q3') as Extract<
      typeof analytics[number],
      { type: 'SHORT_TEXT' | 'LONG_TEXT' }
    >;
    expect(q3).toBeDefined();
    expect(q3.top[0]).toEqual({ value: 'hola', count: 2 });
    expect(q3.unique).toBe(3);
  });
});
