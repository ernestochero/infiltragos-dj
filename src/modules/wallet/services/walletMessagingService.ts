import { sendTemplateMessage, type WhatsAppTemplateComponent } from '@/modules/whatsapp/client';
import type { WalletProfile, WalletSignup } from '@prisma/client';

type ActivationTemplateOptions = {
  languageCode?: string;
};

export async function sendWalletActivationTemplate(
  signup: WalletSignup,
  profile: WalletProfile,
  options: ActivationTemplateOptions = {}
) {
  if (process.env.WALLET_WHATSAPP_DISABLED === 'true') {
    return { status: 'skipped', reason: 'WhatsApp messaging disabled' } as const;
  }
  const templateName = process.env.WALLET_WHATSAPP_TEMPLATE_ACTIVATION;
  if (!templateName) {
    return { status: 'skipped', reason: 'WALLET_WHATSAPP_TEMPLATE_ACTIVATION not set' } as const;
  }

  const languageCode = options.languageCode || process.env.WALLET_WHATSAPP_TEMPLATE_LANG || undefined;

  const bodyParameterName = 'name';

  const components: WhatsAppTemplateComponent[] = [
    {
      type: 'body',
      parameters: [
        {
          type: 'text',
          text: signup.fullName,
          ...(bodyParameterName ? { parameter_name: bodyParameterName } : {}),
        },
      ],
    },
  ];

  return sendTemplateMessage({
    to: profile.phoneNumber,
    template: {
      name: templateName,
      languageCode,
      components,
    },
  });
}

type OtpTemplateOptions = {
  code: string;
  languageCode?: string;
};

export async function sendWalletOtpTemplate(
  profile: WalletProfile,
  options: OtpTemplateOptions
) {
  if (process.env.WALLET_WHATSAPP_DISABLED === 'true') {
    return { status: 'skipped', reason: 'WhatsApp messaging disabled' } as const;
  }
  const templateName = process.env.WALLET_WHATSAPP_TEMPLATE_OTP;
  if (!templateName) {
    return { status: 'skipped', reason: 'WALLET_WHATSAPP_TEMPLATE_OTP not set' } as const;
  }

  const languageCode = options.languageCode || process.env.WALLET_WHATSAPP_TEMPLATE_OTP_LANG || undefined;

  return sendTemplateMessage({
    to: profile.phoneNumber,
    template: {
      name: templateName,
      languageCode,
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: options.code,
            },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            {
              type: 'text',
              text: options.code,
            },
          ],
        },
      ],
    },
  });
}
