import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { getSession } from '@core/api/auth';
import { z } from 'zod';

const DrawSchema = z.object({ count: z.number().int().min(1).max(100).optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const raffle = await prisma.raffle.findUnique({
    where: { id: params.id },
  });
  if (!raffle) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const parse = DrawSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  }
  const count = parse.data.count ?? 1;

  const existingWinnerIds = await prisma.raffleWinner.findMany({
    where: { raffleId: raffle.id },
    select: { raffleEntryId: true },
  });
  const excluded = existingWinnerIds.map(w => w.raffleEntryId);
  const entries = await prisma.raffleEntry.findMany({
    where: { raffleId: raffle.id, id: { notIn: excluded } },
    include: { surveyResponse: true },
  });
  if (entries.length === 0) {
    return NextResponse.json({ error: 'No entries available' }, { status: 400 });
  }
  // shuffle
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }
  const selected = entries.slice(0, count);
  const maxPos = await prisma.raffleWinner.aggregate({
    where: { raffleId: raffle.id },
    _max: { position: true },
  });
  let position = (maxPos._max.position ?? 0) + 1;

  const winnersData = selected.map(e => ({
    raffleId: raffle.id,
    raffleEntryId: e.id,
    position: position++,
  }));
  await prisma.raffleWinner.createMany({ data: winnersData });

  const winners = winnersData.map((w, idx) => {
    const answers = selected[idx].surveyResponse.answers as Record<string, unknown>;
    const preview: Record<string, unknown> = {};
    for (const k of raffle.publicDisplayQuestionIds) {
      preview[k] = answers[k];
    }
    return { position: w.position, raffleEntryId: w.raffleEntryId, publicPreview: preview };
  });

  return NextResponse.json({ ok: true, winners });
}
