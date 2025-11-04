import { NextRequest, NextResponse } from 'next/server';
import { TicketModuleError } from '@ticket/lib/errors';
import { createSmartformOrder } from '@ticket/lib/payments';
import { publicCheckoutSchema } from '@ticket/lib/schemas';

type Params = { slug: string };

function handleError(error: unknown) {
  if (error instanceof TicketModuleError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  console.error('[public-checkout] unexpected error', error);
  return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = publicCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY', details: parsed.error.flatten() }, { status: 400 });
    }
    const payload = parsed.data;
    const init = await createSmartformOrder(params.slug, {
      ticketTypeId: payload.ticketTypeId,
      quantity: payload.quantity,
      buyerName: payload.buyerName,
      buyerEmail: payload.buyerEmail,
      buyerPhone: payload.buyerPhone ?? null,
    });

    return NextResponse.json({
      orderCode: init.orderCode,
      formToken: init.formToken,
      publicKey: init.publicKey,
      scriptUrl: init.scriptUrl,
      amountCents: init.amountCents,
      currency: init.currency,
      ticketType: init.ticketType,
      event: init.event,
      buyer: {
        name: init.buyerName,
        email: init.buyerEmail,
        phone: init.buyerPhone ?? null,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
