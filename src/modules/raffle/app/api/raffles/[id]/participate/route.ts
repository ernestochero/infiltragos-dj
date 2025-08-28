import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { buildZodFromSurvey, normalizeAnswers, Question } from '@survey/lib/validation';
import { phoneNormalizer, sha256Hex, isPhoneLike } from '@raffle/lib/utils';
import { Prisma } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const raffle = await prisma.raffle.findUnique({
    where: { id: params.id },
    include: { survey: { include: { questions: { orderBy: { order: 'asc' } } } } },
  });
  if (!raffle || !raffle.isActive) {
    return NextResponse.json({ error: 'Raffle not active' }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const answers = body?.answers ?? {};
  const questions = raffle.survey.questions as unknown as Question[];
  const schema = buildZodFromSurvey(questions);
  const parse = schema.safeParse(answers);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 422 });
  }
  const normalized = normalizeAnswers(parse.data, questions);

  const response = await prisma.surveyResponse.create({
    data: { surveyId: raffle.surveyId, answers: normalized as Prisma.InputJsonValue },
  });

  let phoneNorm: string | null = null;
  for (const q of questions) {
    const val = normalized[q.id ?? `q${q.order}`];
    if (typeof val === 'string' && isPhoneLike(q.id || q.label)) {
      phoneNorm = phoneNormalizer(val);
      break;
    }
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.ip ?? '0.0.0.0';
  const ua = req.headers.get('user-agent') || '';
  const ipHash = sha256Hex(`${ip}|${ua}`);
  const userAgentShort = ua.slice(0, 200);

  try {
    await prisma.raffleEntry.create({
      data: {
        raffleId: raffle.id,
        surveyResponseId: response.id,
        phoneNorm: phoneNorm ?? undefined,
        ipHash,
        userAgentShort,
      },
    });
  } catch (err) {
    if (err && typeof err === 'object' && (err as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
      const e = err as Prisma.PrismaClientKnownRequestError;
      const target = e.meta?.target as string[] | undefined;
      if (target?.includes('ipHash')) {
        return NextResponse.json({ error: 'Ya participaste desde este dispositivo.' }, { status: 409 });
      }
      if (target?.includes('phoneNorm')) {
        return NextResponse.json({ error: 'Este teléfono ya está inscrito.' }, { status: 409 });
      }
    }
    console.error('raffle participate error', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
