import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { reorderSchema } from '@/lib/schemas';

export async function POST(req: NextRequest) {
  const token = process.env.DJ_ADMIN_TOKEN;
  const auth = req.headers.get('authorization');
  const cookie = req.cookies.get('dj_admin')?.value;
  if (auth !== `Bearer ${token}` && cookie !== token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parse = reorderSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const [index, id] of parse.data.orderedIds.entries()) {
        await tx.request.updateMany({
          where: { id, status: parse.data.columnStatus },
          data: { sortIndex: index, updatedAt: new Date() },
        });
      }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
