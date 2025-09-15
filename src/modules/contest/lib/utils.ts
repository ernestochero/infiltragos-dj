import { sha256Hex } from '@raffle/lib/utils';
import { NextRequest } from 'next/server';

export type PollStatus = 'upcoming' | 'active' | 'finished';

export function getPollStatus(now: Date, startAt: Date, endAt: Date): PollStatus {
  const t = now.getTime();
  if (t < startAt.getTime()) return 'upcoming';
  if (t >= endAt.getTime()) return 'finished';
  return 'active';
}

export function getTimeRemainingMs(now: Date, endAt: Date): number {
  return Math.max(0, endAt.getTime() - now.getTime());
}

/**
 * Build simple hashes to help deduplicate votes.
 * - ipHash: SHA256(ip|ua) (salted implicitly by different UAs per device)
 * - userAgentHash: SHA256(ua)
 * - fingerprintHash: from a cookie `vfp` if present; otherwise undefined
 */
export function buildVoteHashes(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || '0.0.0.0';
  const ua = req.headers.get('user-agent') || '';
  const cookieFp = req.cookies.get('vfp')?.value;
  const isProd = process.env.NODE_ENV === 'production';

  const ipHashBase = `${ip}|${ua}`;
  const ipHash = sha256Hex(isProd ? ipHashBase : `${ipHashBase}|${Date.now()}|${Math.random()}`);
  const userAgentHash = ua ? sha256Hex(ua) : undefined;
  const voterFingerprintHash = cookieFp ? sha256Hex(cookieFp) : undefined;

  return { ipHash, userAgentHash, voterFingerprintHash } as const;
}

