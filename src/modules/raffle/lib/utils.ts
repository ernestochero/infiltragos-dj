import { createHash } from 'crypto';

/** Normalize phone numbers: strip spaces/dashes, remove leading zeros, add +51 if no country code */
export function phoneNormalizer(text: string): string {
  let digits = text.replace(/[^0-9+]/g, '');
  if (digits.startsWith('+')) {
    digits = '+' + digits.slice(1).replace(/^0+/, '');
  } else {
    digits = digits.replace(/^0+/, '');
    if (!digits.startsWith('51')) digits = '51' + digits;
    digits = '+' + digits;
  }
  return digits;
}

/** Return SHA256 hex string for input */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Simple helper to detect phone-like question ids or labels */
export function isPhoneLike(questionIdOrLabel: string): boolean {
  return /(tel|phone|cel)/i.test(questionIdOrLabel);
}
