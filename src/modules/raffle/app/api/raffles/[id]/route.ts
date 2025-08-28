import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { getSession } from '@core/api/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const raffle = await prisma.raffle.findUnique({ where: { id: params.id } });
  if (!raffle) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const session = getSession(req);
  if (!session) {
    // public view
    return NextResponse.json({
      id: raffle.id,
      surveyId: raffle.surveyId,
      isActive: raffle.isActive,
      publicParticipants: raffle.publicParticipants,
      publicDisplayQuestionIds: raffle.publicDisplayQuestionIds,
    });
  }
  return NextResponse.json(raffle);
}
