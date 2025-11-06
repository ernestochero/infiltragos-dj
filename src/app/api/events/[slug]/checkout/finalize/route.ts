import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { refreshPaymentStatus } from '@ticket/lib/payments';
import { TicketModuleError } from '@ticket/lib/errors';

const finalizeSchema = z.object({
  orderCode: z.string().trim().min(6),
  providerStatus: z.string().trim().optional(),
  providerMessage: z.string().trim().optional(),
  transactionUuid: z.string().trim().optional(),
  answer: z.unknown().optional(),
});

function handleError(error: unknown) {
  if (error instanceof TicketModuleError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  console.error('[izipay:finalize] unexpected error', error);
  return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = finalizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const result = await refreshPaymentStatus({
      orderCode: data.orderCode,
      providerStatus: data.providerStatus ?? null,
      providerMessage: data.providerMessage ?? null,
      transactionUuid: data.transactionUuid ?? null,
      rawAnswer: data.answer as object | null | undefined,
      origin: 'client',
    });

    return NextResponse.json({
      paymentStatus: result.paymentStatus,
      providerStatus: result.providerStatus,
      message: result.message,
      orderCode: result.orderCode,
      transactionUuid: result.transactionUuid,
      result: result.result,
    });
  } catch (error) {
    return handleError(error);
  }
}
