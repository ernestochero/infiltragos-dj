import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  S3_ENABLED,
  TICKET_S3_BUCKET,
  TICKET_S3_PREFIX,
  TICKET_S3_REGION,
} from './config';

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!S3_ENABLED) {
    throw new Error('S3 is not properly configured');
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: TICKET_S3_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

function sanitizeExtension(ext?: string | null): string {
  if (!ext) return 'jpg';
  return ext.replace(/^\.*/, '').toLowerCase();
}

export async function uploadBannerToS3(
  buffer: Buffer,
  contentType: string,
  extension?: string | null,
) {
  const client = getClient();
  const ext = sanitizeExtension(extension);
  const key = `${TICKET_S3_PREFIX}/banners/${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}-${randomUUID()}.${ext}`;
  await client.send(
    new PutObjectCommand({
      Bucket: TICKET_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  const baseUrl = `https://${TICKET_S3_BUCKET}.s3.${TICKET_S3_REGION}.amazonaws.com`;
  return { key, url: `${baseUrl}/${key}` };
}
