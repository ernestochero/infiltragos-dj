import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { getSession } from '@core/api/auth';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const RaffleCreateSchema = z.object({
  surveyId: z.string(),
  isActive: z.boolean().optional(),
  publicParticipants: z.boolean().optional(),
  publicDisplayQuestionIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parse = RaffleCreateSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const data = parse.data;
  try {
    const created = await prisma.raffle.create({
      data: {
        surveyId: data.surveyId,
        isActive: data.isActive ?? false,
        publicParticipants: data.publicParticipants ?? true,
        publicDisplayQuestionIds: data.publicDisplayQuestionIds ?? [],
      },
    });
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err) {
    console.error('Create raffle error', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = req.nextUrl;
  const surveyId = searchParams.get('surveyId') || undefined;
  const q = searchParams.get('q') || undefined;
  const where: Prisma.RaffleWhereInput = {};
  if (surveyId) where.surveyId = surveyId;
  if (q) {
    where.OR = [
      { survey: { name: { contains: q, mode: 'insensitive' } } },
      { survey: { slug: { contains: q, mode: 'insensitive' } } },
    ];
  }
  const items = await prisma.raffle.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ items });
}
