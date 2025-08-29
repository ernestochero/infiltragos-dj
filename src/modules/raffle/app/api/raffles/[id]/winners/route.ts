import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const raffle = await prisma.raffle.findUnique({
    where: { id: params.id },
    include: { survey: { include: { questions: true } } },
  });
  if (!raffle) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const winners = await prisma.raffleWinner.findMany({
    where: { raffleId: raffle.id },
    orderBy: { position: 'asc' },
    include: { raffleEntry: { include: { surveyResponse: true } } },
  });

  const items = winners.map(w => {
    const ans = w.raffleEntry.surveyResponse.answers as Record<string, unknown>;
    const preview: Record<string, unknown> = {};
    for (const k of raffle.publicDisplayQuestionIds) preview[k] = ans[k];
    return {
      id: w.id,
      position: w.position,
      raffleEntryId: w.raffleEntryId,
      publicPreview: preview,
      createdAt: w.createdAt,
    };
  });

  return NextResponse.json({ items });
}

