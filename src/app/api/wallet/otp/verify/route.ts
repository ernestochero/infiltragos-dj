import { NextRequest, NextResponse } from 'next/server';
import { verifyWalletOtp } from '@/modules/wallet/services/walletOtpService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.phoneNumber !== 'string' || typeof body.code !== 'string') {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  const result = await verifyWalletOtp(body.phoneNumber, body.code);

  if (!result.ok) {
    const status =
      result.error === 'PROFILE_NOT_FOUND'
        ? 404
        : result.error === 'OTP_INVALID'
        ? 401
        : result.error === 'OTP_MAX_ATTEMPTS'
        ? 423
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
