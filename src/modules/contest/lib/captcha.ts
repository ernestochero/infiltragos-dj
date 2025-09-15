export type CaptchaResult = { ok: true } | { ok: false; reason: string };

/**
 * Verifies captcha tokens for Cloudflare Turnstile or Google reCAPTCHA v2/3.
 * - If no secret is configured, returns ok=true (dev-friendly; enable in prod via envs).
 */
export async function verifyCaptcha(token: string | undefined, remoteip?: string): Promise<CaptchaResult> {
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
  if (!turnstileSecret && !recaptchaSecret) return { ok: true };
  if (!token) return { ok: false, reason: 'missing_token' };

  try {
    if (turnstileSecret) {
      const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: turnstileSecret, response: token, remoteip: remoteip || '' }),
      });
      const json = (await resp.json()) as { success?: boolean; 'error-codes'?: string[] };
      return json.success ? { ok: true } : { ok: false, reason: (json['error-codes'] || []).join(',') || 'invalid' };
    }
    if (recaptchaSecret) {
      const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: recaptchaSecret, response: token, remoteip: remoteip || '' }),
      });
      const json = (await resp.json()) as { success?: boolean; 'error-codes'?: string[] };
      return json.success ? { ok: true } : { ok: false, reason: (json['error-codes'] || []).join(',') || 'invalid' };
    }
  } catch (err) {
    console.error('captcha verify error', err);
    return { ok: false, reason: 'error' };
  }
  return { ok: false, reason: 'unknown' };
}

