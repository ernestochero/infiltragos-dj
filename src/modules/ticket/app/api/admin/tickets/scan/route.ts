import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@core/api/auth';
import { isTicketAdmin } from '@ticket/lib/auth';
import { scanTicket } from '@ticket/lib/service';
import { scanTicketSchema } from '@ticket/lib/schemas';
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
  console.error('[ticket-scan] unexpected error', error);
  return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
}

export async function POST(req: NextRequest) {
  if (!isTicketAdmin(req)) return unauthorized();
  try {
    const body = await req.json();
    const parsed = scanTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY', details: parsed.error.flatten() }, { status: 400 });
    }
    const session = getSession(req);
    const result = await scanTicket(parsed.data, session?.sub);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
