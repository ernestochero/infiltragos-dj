import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { buildZodFromSurvey, normalizeAnswers, Question } from '@survey/lib/validation';
import { checkRateLimit } from '@survey/lib/rate-limit';
import type { Prisma } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const survey = await prisma.survey.findUnique({
    where: { id: params.id },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  if (!survey || survey.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '0.0.0.0';
  const rate = checkRateLimit(`${survey.id}:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfterSeconds: rate.retryAfter },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const answers = body?.answers ?? {};
  const schema = buildZodFromSurvey(survey.questions as unknown as Question[]);
  const parse = schema.safeParse(answers);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 422 });
  }

  const normalized = normalizeAnswers(parse.data, survey.questions as unknown as Question[]);

  await prisma.surveyResponse.create({
    data: { surveyId: survey.id, answers: normalized as Prisma.InputJsonValue },
  });

  return NextResponse.json({ ok: true });
}
