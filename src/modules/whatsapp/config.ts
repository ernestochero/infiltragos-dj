const normalizeBaseUrl = (value?: string | null) => {
  if (!value) return undefined;
  return value.replace(/\/+$/, '');
};

export type WhatsAppConfig = {
  enabled: boolean;
  apiBaseUrl?: string;
  phoneNumberId?: string;
  accessToken?: string;
  defaultLanguageCode: string;
};

export const whatsappConfig: WhatsAppConfig = {
  enabled: process.env.WHATSAPP_ENABLED !== 'false',
  apiBaseUrl: normalizeBaseUrl(process.env.WHATSAPP_API_BASE_URL),
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  defaultLanguageCode: process.env.WHATSAPP_TEMPLATE_DEFAULT_LANG || 'es',
};

export const isWhatsAppConfigured = () =>
  Boolean(
    whatsappConfig.enabled &&
      whatsappConfig.apiBaseUrl &&
      whatsappConfig.phoneNumberId &&
      whatsappConfig.accessToken
  );
