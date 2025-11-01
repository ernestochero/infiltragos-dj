import { NextRequest, NextResponse } from 'next/server';
import { isTicketAdmin } from '@ticket/lib/auth';
import { updateTicketType } from '@ticket/lib/service';
import { ticketTypeSchema } from '@ticket/lib/schemas';
import { TicketModuleError } from '@ticket/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const updateSchema = ticketTypeSchema.partial();

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function handleError(error: unknown) {
  if (error instanceof TicketModuleError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  console.error('[ticket-type-update] unexpected error', error);
  return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
}

type Params = { ticketTypeId: string };

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  if (!isTicketAdmin(req)) return unauthorized();
  try {
    const payload = await req.json();
    const parsed = updateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY', details: parsed.error.flatten() }, { status: 400 });
    }
    const ticketType = await updateTicketType(params.ticketTypeId, parsed.data);
    return NextResponse.json({ ticketType });
  } catch (error) {
    return handleError(error);
  }
}
