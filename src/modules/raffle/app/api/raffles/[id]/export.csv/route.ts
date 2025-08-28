import { NextRequest } from 'next/server';
import prisma from '@core/prisma';
import { getSession } from '@core/api/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession(req);
  if (!session || session.role !== 'ADMIN') {
    return new Response('Unauthorized', { status: 401 });
  }
  const raffle = await prisma.raffle.findUnique({ where: { id: params.id } });
  if (!raffle) return new Response('Not found', { status: 404 });

  const entries = await prisma.raffleEntry.findMany({
    where: { raffleId: raffle.id },
    include: { surveyResponse: true },
    orderBy: { createdAt: 'asc' },
  });
  const allKeys = new Set<string>();
  entries.forEach(e => {
    const ans = e.surveyResponse.answers as Record<string, unknown>;
    Object.keys(ans).forEach(k => allKeys.add(k));
  });
  const headers = ['createdAt', 'ipHash', 'userAgentShort', ...Array.from(allKeys)];
  const rows = entries.map(e => {
    const ans = e.surveyResponse.answers as Record<string, unknown>;
    const ipMasked = e.ipHash.slice(0, 6) + '***';
    const row = [e.createdAt.toISOString(), ipMasked, e.userAgentShort ?? ''];
    for (const k of allKeys) {
      const val = ans[k as string];
      row.push(typeof val === 'string' ? val : JSON.stringify(val ?? ''));
    }
    return row.join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv' },
  });
}
