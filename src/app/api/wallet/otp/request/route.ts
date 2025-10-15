import { NextRequest, NextResponse } from 'next/server';
import { requestWalletOtp } from '@/modules/wallet/services/walletOtpService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.phoneNumber !== 'string') {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  const result = await requestWalletOtp(body.phoneNumber);
  if (!result.ok) {
    switch (result.error) {
      case 'PROFILE_NOT_FOUND':
        return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 });
      case 'COOLDOWN': {
        const retryAfter = result.retryAfter ?? 60;
        return NextResponse.json(
          { error: 'COOLDOWN', retryAfter },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        );
      }
      default:
        return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  return NextResponse.json({
    ok: true,
    expiresIn: result.expiresIn,
    cooldown: result.cooldown,
  });
}
