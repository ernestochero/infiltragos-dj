import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { getSession } from '@core/api/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const raffle = await prisma.raffle.findUnique({ where: { id: params.id } });
  if (!raffle) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  const entries = await prisma.raffleEntry.findMany({
    where: { raffleId: raffle.id },
    include: { surveyResponse: true },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
  });
  const total = await prisma.raffleEntry.count({ where: { raffleId: raffle.id } });

  const session = getSession(req);
  if (raffle.publicParticipants) {
    const items = entries.map(e => {
      const answers = e.surveyResponse.answers as Record<string, unknown>;
      const picked: Record<string, unknown> = {};
      for (const k of raffle.publicDisplayQuestionIds) {
        picked[k] = answers[k];
      }
      return picked;
    });
    return NextResponse.json({ items, total, page, pageSize });
  }

  if (!session || (session.role !== 'ADMIN' && session.role !== 'DJ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = entries.map(e => ({
    id: e.id,
    createdAt: e.createdAt,
    userAgentShort: e.userAgentShort,
    phoneNorm: e.phoneNorm,
    surveyResponseId: e.surveyResponseId,
    answers: e.surveyResponse.answers,
  }));
  return NextResponse.json({ items, total, page, pageSize });
}
