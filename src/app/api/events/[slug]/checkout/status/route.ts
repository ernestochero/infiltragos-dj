import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadPaymentFulfillment } from '@ticket/lib/payments';
import { TicketModuleError } from '@ticket/lib/errors';

const querySchema = z.object({
  orderCode: z.string().trim().min(6),
});

function handleError(error: unknown) {
  if (error instanceof TicketModuleError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  console.error('[izipay:status] unexpected error', error);
  return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const parsed = querySchema.safeParse({
      orderCode: req.nextUrl.searchParams.get('orderCode'),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_QUERY', details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await loadPaymentFulfillment(parsed.data.orderCode);

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
