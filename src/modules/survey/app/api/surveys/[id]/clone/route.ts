import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { getSession } from '@core/api/auth';
import { Prisma, SurveyStatus } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const src = await prisma.survey.findUnique({
    where: { id: params.id },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  if (!src) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Build a unique slug based on the original
  const base = `${src.slug}-copia`;
  let slug = base;
  let n = 1;
  while (await prisma.survey.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const created = await prisma.survey.create({
    data: {
      name: `${src.name} (copia)`,
      slug,
      description: src.description ?? undefined,
      status: 'DRAFT' as SurveyStatus,
      effectiveFrom: null,
      questions: {
        create: src.questions
          .sort((a, b) => a.order - b.order)
          .map((q, idx) => ({
            // Do not reuse IDs; let Prisma generate new ones
            type: q.type,
            label: q.label,
            required: q.required ?? false,
            order: idx,
            helpText: q.helpText ?? undefined,
            options: q.options as unknown as Prisma.InputJsonValue,
          })),
      },
    },
    include: { questions: true },
  });

  return NextResponse.json({ id: created.id, slug: created.slug });
}
