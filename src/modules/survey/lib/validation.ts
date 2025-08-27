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
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  effectiveFrom: z.coerce.date().optional(),
  questions: z.array(QuestionSchema),
});

export type Question = z.infer<typeof QuestionSchema>;

export function SurveyResponseSchema(questions: Question[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const q of questions) {
    let schema: z.ZodTypeAny = z.any();
    switch (q.type) {
      case 'SHORT_TEXT':
      case 'LONG_TEXT':
        schema = z.string();
        break;
      case 'EMAIL':
        schema = z.string().email();
        break;
      case 'PHONE':
        schema = z.string();
        break;
      case 'DATE':
        schema = z.coerce.date();
        break;
      case 'SINGLE_CHOICE':
        schema = z.string().refine(
          val => !q.options || q.options.some(o => o.value === val),
          { message: 'Invalid option' },
        );
        break;
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
    if (!q.required) {
      schema = schema.optional();
    }
    shape[q.id ?? `q${q.order}`] = schema;
  }
  return z.object(shape);
}

export function normalizeAnswers(answers: Record<string, unknown>, questions: Question[]) {
  const result: Record<string, unknown> = {};
  for (const q of questions) {
    const key = q.id ?? `q${q.order}`;
    const val = answers[key];
    if (q.type === 'MULTIPLE_CHOICE') {
      if (Array.isArray(val)) {
        result[key] = val;
      } else if (typeof val === 'string') {
        result[key] = [val];
      } else {
        result[key] = [];
      }
    } else {
      if (Array.isArray(val)) {
        result[key] = val[0];
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}
