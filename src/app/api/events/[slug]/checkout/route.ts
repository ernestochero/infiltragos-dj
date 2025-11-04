import { NextRequest, NextResponse } from 'next/server';
import { TicketModuleError } from '@ticket/lib/errors';
import { getPublicEvent, issueTickets } from '@ticket/lib/service';
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
    const data = await getPublicEvent(params.slug);

    const ticketType = data.ticketTypes.find((t) => t.id === payload.ticketTypeId);
    if (!ticketType) {
      return NextResponse.json({ error: 'TICKET_TYPE_NOT_AVAILABLE' }, { status: 404 });
    }

    const remaining = Math.max(
      ticketType.totalQuantity - (ticketType.stats.total - ticketType.stats.cancelled),
      0,
    );
    if (remaining < payload.quantity) {
      return NextResponse.json(
        { error: 'NOT_ENOUGH_STOCK', message: 'No hay stock suficiente para esta compra.' },
        { status: 400 },
      );
    }

    const result = await issueTickets({
      eventId: data.event.id,
      ticketTypeId: ticketType.id,
      recipientName: payload.buyerName,
      recipientEmail: payload.buyerEmail,
      recipientPhone: payload.buyerPhone ?? undefined,
      quantity: payload.quantity,
      note: 'Compra web',
      sendEmail: true,
    });

    return NextResponse.json({
      ok: true,
      tickets: result.tickets,
      event: {
        id: data.event.id,
        title: data.event.title,
        startsAt: data.event.startsAt,
        venue: data.event.venue,
      },
      ticketType: {
        id: ticketType.id,
        name: ticketType.name,
        priceCents: ticketType.priceCents,
        currency: ticketType.currency,
      },
      recipientEmail: result.recipientEmail,
    });
  } catch (error) {
    return handleError(error);
  }
}
