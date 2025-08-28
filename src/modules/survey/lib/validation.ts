import { z } from 'zod';

export const QuestionTypeEnum = z.enum([
  'SHORT_TEXT',
  'LONG_TEXT',
  'EMAIL',
  'PHONE',
  'DATE',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
]);

const OptionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  value: z.string().min(1),
  order: z.number().int(),
});

export const QuestionSchema = z
  .object({
    id: z.string().optional(),
    type: QuestionTypeEnum,
    label: z.string().min(1),
    required: z.boolean().optional().default(false),
    order: z.number().int(),
    helpText: z.string().optional(),
    options: z.array(OptionSchema).optional(),
  })
  .refine(
    q =>
      ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(q.type)
        ? Array.isArray(q.options) && q.options.length >= 2
        : !q.options?.length,
    {
      message: 'Choice questions must have at least two options',
      path: ['options'],
    },
  );

export const SurveyUpsertSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  effectiveFrom: z.coerce.date().optional(),
  questions: z.array(QuestionSchema),
});

export type Question = z.infer<typeof QuestionSchema>;

export function buildZodFromSurvey(questions: Question[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const q of questions) {
    let schema: z.ZodTypeAny = z.any();
    switch (q.type) {
      case 'SHORT_TEXT':
      case 'LONG_TEXT': {
        schema = z.string();
        break;
      }
      case 'EMAIL': {
        schema = z.string().email();
        break;
      }
      case 'PHONE': {
        schema = z.string().regex(/^[+]?[0-9]{7,15}$/);
        break;
      }
      case 'DATE': {
        schema = z.string().refine(val => {
          // Check format
          if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
          // Parse components
          const [year, month, day] = val.split('-').map(Number);
          const date = new Date(val + 'T00:00:00Z');
          // Check that date is valid and matches input
          return (
            date instanceof Date &&
            !isNaN(date.getTime()) &&
            date.getUTCFullYear() === year &&
            date.getUTCMonth() + 1 === month &&
            date.getUTCDate() === day
          );
        }, { message: 'Invalid date' });
        break;
      }
      case 'SINGLE_CHOICE': {
        schema = z.string().refine(
          val => !q.options || q.options.some(o => o.value === val),
          { message: 'Invalid option' },
        );
        break;
      }
      case 'MULTIPLE_CHOICE': {
        let arrSchema = z.array(z.string());
        if (q.required) arrSchema = arrSchema.min(1);
        schema = arrSchema.refine(
          arr => !q.options || arr.every(v => q.options!.some(o => o.value === v)),
          { message: 'Invalid option' },
        );
        break;
      }
      default:
        schema = z.any();
    }
    if (q.required) {
      schema = schema.refine(v => {
        if (typeof v === 'string') return v.trim().length > 0;
        if (Array.isArray(v)) return v.length > 0;
        return v !== undefined && v !== null;
      }, { message: 'Required' });
    } else {
      schema = schema.optional();
    }
    shape[q.id ?? `q${q.order}`] = schema;
  }
  return z.object(shape);
}

export const SurveyResponseSchema = buildZodFromSurvey;

export function normalizeAnswers(answers: Record<string, unknown>, questions: Question[]) {
  const result: Record<string, unknown> = {};
  for (const q of questions) {
    const key = q.id ?? `q${q.order}`;
    const val = answers[key];
    if (q.type === 'MULTIPLE_CHOICE') {
      if (Array.isArray(val)) {
        result[key] = val.map(v => (typeof v === 'string' ? v.trim() : v));
      } else if (typeof val === 'string') {
        result[key] = [val.trim()];
      } else {
        result[key] = [];
      }
    } else {
      if (Array.isArray(val)) {
        const first = val[0];
        result[key] = typeof first === 'string' ? first.trim() : first;
      } else if (typeof val === 'string') {
        result[key] = val.trim();
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

export const SurveyPublicQuestionSchema = z.object({
  id: z.string().optional(),
  type: QuestionTypeEnum,
  label: z.string(),
  required: z.boolean().optional().default(false),
  options: z.array(OptionSchema).optional(),
  helpText: z.string().optional(),
});

export const SurveyPublicSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  description: z.string().nullable().optional(),
  questions: z.array(SurveyPublicQuestionSchema),
});

export const SurveyPublicResponseSchema = z.object({
  answers: z.record(z.any()),
});
