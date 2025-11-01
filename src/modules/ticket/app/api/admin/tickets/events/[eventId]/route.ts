import { NextRequest, NextResponse } from 'next/server';
import { isTicketAdmin } from '@ticket/lib/auth';
import { getEventDetail, updateEvent } from '@ticket/lib/service';
import { eventUpdateSchema } from '@ticket/lib/schemas';
import { TicketModuleError } from '@ticket/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function handleError(error: unknown) {
  if (error instanceof TicketModuleError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  console.error('[ticket-event-detail] unexpected error', error);
  return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
}

type Params = { eventId: string };

export async function GET(req: NextRequest, { params }: { params: Params }) {
  if (!isTicketAdmin(req)) return unauthorized();
  try {
    const data = await getEventDetail(params.eventId);
    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  if (!isTicketAdmin(req)) return unauthorized();
  try {
    const payload = await req.json();
    const parsed = eventUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY', details: parsed.error.flatten() }, { status: 400 });
    }
    const event = await updateEvent(params.eventId, parsed.data);
    return NextResponse.json({ event });
  } catch (error) {
    return handleError(error);
  }
}
