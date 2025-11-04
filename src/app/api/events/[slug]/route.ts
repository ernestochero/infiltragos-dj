import { NextResponse } from 'next/server';
import { getPublicEvent } from '@ticket/lib/service';
import { TicketModuleError } from '@ticket/lib/errors';

type Params = { slug: string };

export async function GET(_req: Request, { params }: { params: Params }) {
  try {
    const data = await getPublicEvent(params.slug);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof TicketModuleError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    console.error('public event error', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
