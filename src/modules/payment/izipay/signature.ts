import crypto from 'node:crypto';
import { IZIPAY_SHA_KEY } from './config';

export function computeIzipaySignature(payload: string) {
  return crypto.createHash('sha256').update(`${payload}${IZIPAY_SHA_KEY}`, 'utf8').digest('hex');
}

export function verifyIzipaySignature(payload: string, signature?: string | null) {
  if (!signature) return false;
  const expected = computeIzipaySignature(payload);
  return expected.toLowerCase() === signature.toLowerCase();
}
