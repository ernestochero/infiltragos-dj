import crypto from 'node:crypto';
import { IZIPAY_API_PASSWORD, IZIPAY_SHA_KEY } from './config';

function resolveIzipaySecret(key?: string | null) {
  const normalized = key?.toLowerCase();
  switch (normalized) {
    case 'password':
      return IZIPAY_API_PASSWORD || IZIPAY_SHA_KEY;
    case 'sha-256':
    case 'sha256':
    case 'sha-256-hmac':
    case 'sha256_hmac':
      return IZIPAY_SHA_KEY;
    default:
      return IZIPAY_SHA_KEY;
  }
}

export function computeIzipaySignature(payload: string, key?: string | null) {
  const secret = resolveIzipaySecret(key);
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

export function verifyIzipaySignature(
  payload: string,
  signature?: string | null,
  key?: string | null,
) {
  if (!signature) return false;
  const expected = computeIzipaySignature(payload, key);
  return expected.toLowerCase() === signature.toLowerCase();
}

export { resolveIzipaySecret };
