import { sendTemplateMessage, type WhatsAppTemplateComponent } from '@/modules/whatsapp/client';
import type { WalletProfile, WalletSignup } from '@prisma/client';

type ActivationTemplateOptions = {
  portalUrl: string;
  walletLandingUrl: string;
  languageCode?: string;
};

export async function sendWalletActivationTemplate(
  signup: WalletSignup,
  profile: WalletProfile,
  options: ActivationTemplateOptions
) {
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

  const dynamicButtons = process.env.WALLET_WHATSAPP_TEMPLATE_DYNAMIC_BUTTONS === 'true';
  if (dynamicButtons) {
    components.push(
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: options.walletLandingUrl, parameter_name: 'wallet_url' }],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '1',
        parameters: [{ type: 'text', text: options.portalUrl, parameter_name: 'portal_url' }],
      }
    );
  }

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
