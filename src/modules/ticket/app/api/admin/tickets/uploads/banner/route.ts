import { NextRequest, NextResponse } from 'next/server';
import { isTicketAdmin } from '@ticket/lib/auth';
import { uploadBannerToS3 } from '@ticket/lib/s3';
import { S3_ENABLED } from '@ticket/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function POST(req: NextRequest) {
  if (!isTicketAdmin(req)) return unauthorized();
  if (!S3_ENABLED) {
    return NextResponse.json(
      { error: 'S3_NOT_CONFIGURED', message: 'Configura TICKET_S3_* para usar uploads.' },
      { status: 501 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = (file as File).name || 'banner.jpg';
    const ext = filename.includes('.') ? filename.split('.').pop() : undefined;
    const contentType = (file as File).type || 'application/octet-stream';
    const result = await uploadBannerToS3(buffer, contentType, ext);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[ticket-upload-banner] error', error);
    return NextResponse.json({ error: 'UPLOAD_FAILED' }, { status: 500 });
  }
}
