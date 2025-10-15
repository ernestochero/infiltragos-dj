import { z } from 'zod';

export const walletSignupSchema = z.object({
  fullName: z
    .string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(3, 'Ingresa tu nombre completo')
    .max(120, 'El nombre es demasiado largo'),
  phoneNumber: z
    .string({ required_error: 'El número de celular es obligatorio' })
    .trim()
    .transform((value) => value.replace(/[\s-]+/g, ''))
    .transform((value) => {
      const hasPlus = value.startsWith('+');
      const digits = value.replace(/\D/g, '');
      return hasPlus ? `+${digits}` : digits;
    })
    .refine((value) => /^\+?[0-9]{6,20}$/.test(value), {
      message: 'Ingresa un número válido (ej. +51987654321)',
    }),
  email: z
    .string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .toLowerCase()
    .email('Ingresa un correo válido')
    .max(160, 'El correo es demasiado largo'),
});

export type WalletSignupInput = z.infer<typeof walletSignupSchema>;
