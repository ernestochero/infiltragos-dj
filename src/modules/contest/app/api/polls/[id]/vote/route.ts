import { NextRequest, NextResponse } from 'next/server';
import prisma from '@core/prisma';
import { buildVoteHashes, getPollStatus } from '@/modules/contest/lib/utils';
import { verifyCaptcha } from '@/modules/contest/lib/captcha';
import { rateLimit } from '@core/api/rate-limit';
import { rateLimitByRequest } from '@core/api/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limit = rateLimitByRequest(req, `poll:vote:${params.id}`, 5, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const contestantId: string | undefined = body?.contestantId;
  if (!contestantId) return NextResponse.json({ error: 'contestantId required' }, { status: 400 });

  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    include: { contestants: true },
  });
  if (!poll) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const status = getPollStatus(new Date(), poll.startAt, poll.endAt);
  if (status !== 'active') return NextResponse.json({ error: 'Poll not active' }, { status: 409 });

  const eligible = poll.contestants.find((pc) => pc.contestantId === contestantId);
  if (!eligible) return NextResponse.json({ error: 'Contestant not in this poll' }, { status: 400 });

  const { ipHash, userAgentHash, voterFingerprintHash } = buildVoteHashes(req);

  // Abuse heuristic: if too many attempts from same IP recently, require captcha
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || '0.0.0.0';
  const abuse = rateLimit(`abuse:poll:${params.id}:ip:${ip}`, 10, 60_000);
  if (!abuse.allowed) {
    const captchaToken: string | undefined = body?.captchaToken;
    const verification = await verifyCaptcha(captchaToken, ip);
    if (!verification.ok) {
      return NextResponse.json({ error: 'Captcha required', reason: verification.reason }, { status: 403 });
    }
  }

  // Check duplicates by fingerprint if present, otherwise by ipHash
  const existing = await prisma.pollVote.findFirst({
    where: {
      pollId: poll.id,
      OR: [
        ...(voterFingerprintHash ? [{ voterFingerprintHash }] : []),
        { ipHash },
      ],
    },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: 'Already voted' }, { status: 409 });

  try {
    await prisma.$transaction([
      prisma.pollVote.create({
        data: {
          pollId: poll.id,
          contestantId,
          voterFingerprintHash: voterFingerprintHash ?? undefined,
          ipHash,
          userAgentHash: userAgentHash ?? undefined,
        },
      }),
      prisma.pollContestant.update({
        where: { id: eligible.id },
        data: { tally: { increment: 1 } },
      }),
    ]);
  } catch (err) {
    console.error('poll vote error', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
