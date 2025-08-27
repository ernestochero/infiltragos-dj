import { describe, it, expect } from 'vitest';
import { SurveyResponseSchema, normalizeAnswers, Question } from '@survey/lib/validation';

const questions: Question[] = [
  { id: 'q1', type: 'SHORT_TEXT', label: 'Name', order: 0, required: true },
  { id: 'q2', type: 'EMAIL', label: 'Email', order: 1, required: false },
  { id: 'q3', type: 'SINGLE_CHOICE', label: 'Color', order: 2, required: true, options: ['red', 'blue'] },
  { id: 'q4', type: 'MULTIPLE_CHOICE', label: 'Fruits', order: 3, required: false, options: ['apple', 'banana'] },
];

describe('SurveyResponseSchema', () => {
  it('validates responses per question type', () => {
    const schema = SurveyResponseSchema(questions);
    const parsed = schema.parse({
      q1: 'John',
      q2: 'john@example.com',
      q3: 'red',
      q4: ['apple'],
    });
    expect(parsed.q1).toBe('John');
  });

  it('normalizes single and multiple choice answers', () => {
    const normalized = normalizeAnswers(
      { q3: 'red', q4: 'banana' },
      questions,
    );
    expect(normalized.q3).toBe('red');
    expect(normalized.q4).toEqual(['banana']);
  });
});
