export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_BASE_URL ||
  'http://localhost:3000';

export const TICKET_S3_BUCKET = process.env.TICKET_S3_BUCKET || '';
export const TICKET_S3_PREFIX = process.env.TICKET_S3_PREFIX || 'tickets';
export const TICKET_S3_REGION =
  process.env.TICKET_S3_REGION || process.env.AWS_REGION || 'us-east-1';

export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';

export const TICKET_EMAIL_FROM = process.env.TICKET_EMAIL_FROM || '';
export const TICKET_EMAIL_REPLY_TO = process.env.TICKET_EMAIL_REPLY_TO || '';
export const TICKET_SMTP_HOST = process.env.TICKET_SMTP_HOST || '';
export const TICKET_SMTP_PORT = Number(process.env.TICKET_SMTP_PORT || '0');
export const TICKET_SMTP_USER = process.env.TICKET_SMTP_USER || '';
export const TICKET_SMTP_PASS = process.env.TICKET_SMTP_PASS || '';

export const EMAIL_ENABLED =
  !!TICKET_EMAIL_FROM &&
  !!TICKET_SMTP_HOST &&
  !!TICKET_SMTP_PORT &&
  !!TICKET_SMTP_USER &&
  !!TICKET_SMTP_PASS;

export const S3_ENABLED =
  !!TICKET_S3_BUCKET && !!AWS_ACCESS_KEY_ID && !!AWS_SECRET_ACCESS_KEY;

export const DEFAULT_QR_SIZE = Number(process.env.TICKET_QR_SIZE || 280);

function envToBoolean(value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value === null) return defaultValue;
  return !['false', '0', 'off', 'no'].includes(value.trim().toLowerCase());
}

const eventPaymentsFlag =
  process.env.EVENT_PAYMENTS_ENABLED ?? process.env.NEXT_PUBLIC_EVENT_PAYMENTS_ENABLED;

export const EVENT_PAYMENTS_ENABLED = envToBoolean(eventPaymentsFlag, true);
