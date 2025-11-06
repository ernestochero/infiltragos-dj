export const IZIPAY_API_ENDPOINT =
  process.env.IZIPAY_API_ENDPOINT || 'https://api.micuentaweb.pe/api-payment';

export const IZIPAY_JS_URL =
  process.env.IZIPAY_JS_URL ||
  'https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js';

export const IZIPAY_SITE_ID = process.env.IZIPAY_SITE_ID || '';
export const IZIPAY_API_PASSWORD = process.env.IZIPAY_API_PASSWORD || '';
export const IZIPAY_SHA_KEY = process.env.IZIPAY_SHA_KEY || '';
export const IZIPAY_PUBLIC_KEY = process.env.IZIPAY_PUBLIC_KEY || '';

export function ensureIzipayCredentials() {
  if (!IZIPAY_SITE_ID || !IZIPAY_API_PASSWORD || !IZIPAY_SHA_KEY || !IZIPAY_PUBLIC_KEY) {
    throw new Error(
      'Configura Izipay: IZIPAY_SITE_ID, IZIPAY_API_PASSWORD, IZIPAY_SHA_KEY e IZIPAY_PUBLIC_KEY.',
    );
  }
}
