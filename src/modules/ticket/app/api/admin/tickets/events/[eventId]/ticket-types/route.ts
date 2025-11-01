import { NextRequest, NextResponse } from 'next/server';
import { isTicketAdmin } from '@ticket/lib/auth';
import { createTicketType, listTicketTypes } from '@ticket/lib/service';
import { ticketTypeSchema } from '@ticket/lib/schemas';
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
  console.error('[ticket-types] unexpected error', error);
  return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
}

type Params = { eventId: string };

export async function GET(req: NextRequest, { params }: { params: Params }) {
  if (!isTicketAdmin(req)) return unauthorized();
  try {
    const items = await listTicketTypes(params.eventId);
    return NextResponse.json({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  if (!isTicketAdmin(req)) return unauthorized();
  try {
    const payload = await req.json();
    const parsed = ticketTypeSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY', details: parsed.error.flatten() }, { status: 400 });
    }
    const ticketType = await createTicketType(params.eventId, parsed.data);
    return NextResponse.json({ ticketType }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
