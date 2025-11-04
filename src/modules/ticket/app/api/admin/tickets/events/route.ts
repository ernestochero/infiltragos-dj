import { NextRequest, NextResponse } from 'next/server';
import { isTicketAdmin } from '@ticket/lib/auth';
import { createEvent, listEvents } from '@ticket/lib/service';
import { eventCreateSchema } from '@ticket/lib/schemas';
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
  console.error('[ticket-events] unexpected error', error);
  return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
}

export async function GET(req: NextRequest) {
  if (!isTicketAdmin(req)) return unauthorized();
  try {
    const items = await listEvents();
    return NextResponse.json({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  if (!isTicketAdmin(req)) return unauthorized();
  try {
    const payload = await req.json();
    const parsed = eventCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_BODY', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const event = await createEvent(parsed.data);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
