import { NextRequest, NextResponse } from 'next/server';
import { saveWalletSignup, WalletSignupValidationError } from '@/modules/wallet/services/walletSignupService';
import { sendWalletActivationTemplate } from '@/modules/wallet/services/walletMessagingService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }
  try {
    const result = await saveWalletSignup(body);
    const baseUrl =
      process.env.WALLET_TEMPLATE_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      '';
    const withBase = baseUrl.replace(/\/+$/, '');
    const portalUrl = process.env.WALLET_PORTAL_URL || (withBase ? `${withBase}/wallet/portal` : '');
    const walletLandingUrl =
      process.env.WALLET_PASS_LANDING_URL || (withBase ? `${withBase}/wallet/add` : '');

    let messageStatus: { status: string; reason?: string } | undefined;
    try {
      if (portalUrl && walletLandingUrl) {
        const sendResult = await sendWalletActivationTemplate(result.record, result.profile, {
          portalUrl,
          walletLandingUrl,
        });
        messageStatus =
          sendResult.status === 'skipped'
            ? { status: 'skipped', reason: sendResult.reason }
            : { status: sendResult.status };
      } else {
        messageStatus = { status: 'skipped', reason: 'Missing portal or wallet landing URL' };
      }
    } catch (err) {
      console.error('Wallet activation template error', err);
      messageStatus = { status: 'failed', reason: 'unexpected_error' };
    }

    return NextResponse.json(
      {
        id: result.record.id,
        profileId: result.profile.id,
        created: result.created,
        messageStatus,
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    if (error instanceof WalletSignupValidationError) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', issues: error.issues }, { status: 400 });
    }
    console.error('Wallet signup error', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
