import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requestStatusSchema } from '@/lib/schemas';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parse = requestStatusSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  try {
    const updated = await prisma.request.update({
      where: { id: params.id },
      data: {
        status: parse.data.status,
        sortIndex: parse.data.sortIndex ?? undefined,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
