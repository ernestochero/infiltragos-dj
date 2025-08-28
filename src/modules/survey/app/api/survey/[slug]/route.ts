import { NextResponse, NextRequest } from 'next/server';
import prisma from '@core/prisma';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const survey = await prisma.survey.findUnique({
    where: { slug: params.slug },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  if (!survey || survey.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(survey);
}
