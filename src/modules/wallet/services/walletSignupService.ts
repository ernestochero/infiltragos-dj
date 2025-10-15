import prisma from '@core/prisma';
import type { WalletProfile, WalletSignup } from '@prisma/client';
import { walletSignupSchema, type WalletSignupInput } from '../lib/schema';

export class WalletSignupValidationError extends Error {
  constructor(public readonly issues: Record<string, string[]>) {
    super('WALLET_SIGNUP_VALIDATION_ERROR');
  }
}

export type WalletSignupResult = {
  record: WalletSignup;
  profile: WalletProfile;
  created: boolean;
};

export async function saveWalletSignup(payload: unknown): Promise<WalletSignupResult> {
  const parsed = walletSignupSchema.safeParse(payload);
  if (!parsed.success) {
    throw new WalletSignupValidationError(parsed.error.flatten().fieldErrors);
  }
  const data: WalletSignupInput = parsed.data;
  return prisma.$transaction(async (tx) => {
    const existingSignup = await tx.walletSignup.findUnique({
      where: { phoneNumber: data.phoneNumber },
    });

    let record: WalletSignup;
    let created = false;

    if (existingSignup) {
      record = await tx.walletSignup.update({
        where: { phoneNumber: data.phoneNumber },
        data: {
          fullName: data.fullName,
          email: data.email,
        },
      });
    } else {
      record = await tx.walletSignup.create({
        data: {
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          email: data.email,
        },
      });
      created = true;
    }

    let profile = await tx.walletProfile.findUnique({
      where: { phoneNumber: data.phoneNumber },
    });

    if (!profile) {
      profile = await tx.walletProfile.create({
        data: {
          phoneNumber: data.phoneNumber,
          signup: { connect: { id: record.id } },
        },
      });
    } else if (profile.signupId !== record.id) {
      profile = await tx.walletProfile.update({
        where: { id: profile.id },
        data: { signup: { connect: { id: record.id } } },
      });
    }

    if (!profile) {
      throw new Error('Wallet profile creation failed');
    }

    return { record, profile, created };
  });
}
