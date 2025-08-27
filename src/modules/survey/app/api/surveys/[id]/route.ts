import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { hasAdminCookie } from '@core/api/auth';
import { SurveyUpsertSchema } from '@survey/lib/validation';
import { SurveyStatus } from '@prisma/client';

interface Context {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: Context) {
  if (!hasAdminCookie(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const survey = await prisma.survey.findUnique({
    where: { id: params.id },
    include: { questions: true, _count: { select: { responses: true } } },
  });
  if (!survey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(survey);
}

export async function PATCH(req: NextRequest, { params }: Context) {
  if (!hasAdminCookie(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parse = SurveyUpsertSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const data = parse.data;
  try {
    const updated = await prisma.$transaction(async tx => {
      await tx.surveyQuestion.deleteMany({ where: { surveyId: params.id } });
      const survey = await tx.survey.update({
        where: { id: params.id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          status: data.status as SurveyStatus,
          effectiveFrom: data.effectiveFrom,
          questions: {
            create: data.questions.map((q, idx) => ({
              id: q.id,
              type: q.type,
              label: q.label,
              required: q.required ?? false,
              order: idx,
              helpText: q.helpText,
              options: q.options,
            })),
          },
        },
        include: { questions: true },
      });
      return survey;
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Error updating survey:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  if (!hasAdminCookie(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const survey = await prisma.survey.update({
      where: { id: params.id },
      data: { status: SurveyStatus.ARCHIVED },
    });
    return NextResponse.json(survey);
  } catch (err) {
    console.error('Error deleting survey:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
