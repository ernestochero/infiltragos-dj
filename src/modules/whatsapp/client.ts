import { whatsappConfig, isWhatsAppConfigured } from './config';

export type WhatsAppTemplateTextParameter = {
  type: 'text';
  text: string;
  parameter_name?: string;
};

export type WhatsAppTemplateOtpParameter = {
  type: 'otp';
  otp: {
    code: string;
  };
};

export type WhatsAppTemplateParameter = WhatsAppTemplateTextParameter | WhatsAppTemplateOtpParameter;

export type WhatsAppTemplateComponent =
  | {
      type: 'body' | 'header';
      parameters?: WhatsAppTemplateParameter[];
    }
  | {
      type: 'button';
      sub_type: 'url' | 'quick_reply' | 'copy_code';
      index: string;
      parameters?: WhatsAppTemplateParameter[];
    };

export type WhatsAppTemplatePayload = {
  name: string;
  languageCode?: string;
  components?: WhatsAppTemplateComponent[];
};

export type WhatsAppSendOptions = {
  to: string;
  template: WhatsAppTemplatePayload;
};

export type WhatsAppSendResult =
  | { status: 'skipped'; reason: string }
  | { status: 'sent'; response: unknown }
  | { status: 'failed'; response: unknown; statusCode: number };

const sanitizePhone = (phone: string) => phone.replace(/[^\d]/g, '');

export async function sendTemplateMessage(options: WhatsAppSendOptions): Promise<WhatsAppSendResult> {
  if (!whatsappConfig.enabled) {
    return { status: 'skipped', reason: 'WhatsApp messaging disabled via WHATSAPP_ENABLED' };
  }

  if (!isWhatsAppConfigured()) {
    return { status: 'skipped', reason: 'Missing WhatsApp API configuration' };
  }

  const { apiBaseUrl, phoneNumberId, accessToken, defaultLanguageCode } = whatsappConfig;
  const to = sanitizePhone(options.to);
  if (!to) {
    return { status: 'skipped', reason: 'Destination phone number is empty after sanitization' };
  }

  const url = `${apiBaseUrl}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: options.template.name,
      language: { code: options.template.languageCode || defaultLanguageCode },
      components: options.template.components,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { status: 'sent', response: data };
    }
    console.error('WhatsApp template send failed', {
      status: res.status,
      data,
      raw: JSON.stringify(data),
    });
    return { status: 'failed', statusCode: res.status, response: data };
  } catch (error) {
    console.error('WhatsApp template send error', error);
    return { status: 'failed', statusCode: 0, response: { error: 'network_error' } };
  }
}
