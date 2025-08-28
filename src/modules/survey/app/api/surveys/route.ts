import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { getSession } from '@core/api/auth';
import { SurveyUpsertSchema } from '@survey/lib/validation';
import { Prisma, SurveyStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q') || '';
  const statusRaw = searchParams.get('status')?.toUpperCase() as SurveyStatus | undefined;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  const where: Prisma.SurveyWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (statusRaw && Object.values(SurveyStatus).includes(statusRaw)) {
    where.status = statusRaw;
  }
  if (from || to) {
    where.updatedAt = {};
    if (from) where.updatedAt.gte = new Date(from);
    if (to) where.updatedAt.lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    prisma.survey.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { responses: true } } },
    }),
    prisma.survey.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parse = SurveyUpsertSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const data = parse.data;
  try {
    const created = await prisma.survey.create({
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
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Error creating survey:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
