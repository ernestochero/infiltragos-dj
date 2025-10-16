import prisma from '@core/prisma';
import { createHash, randomInt } from 'crypto';
import { sendWalletOtpTemplate } from './walletMessagingService';

const OTP_LENGTH = parseInt(process.env.WALLET_OTP_LENGTH || '6', 10);
const OTP_TTL_SECONDS = parseInt(process.env.WALLET_OTP_TTL_SECONDS || '300', 10);
const OTP_COOLDOWN_SECONDS = parseInt(process.env.WALLET_OTP_COOLDOWN_SECONDS || '60', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.WALLET_OTP_MAX_ATTEMPTS || '5', 10);

const sanitizePhone = (phone: string) => {
  const digits = phone.replace(/[^\d]/g, '');
  return digits.startsWith('51') ? `+${digits}` : phone.startsWith('+') ? `+${digits}` : `+${digits}`;
};

const generateOtpCode = () => {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return String(randomInt(min, max + 1)).padStart(OTP_LENGTH, '0');
};

const hashOtpCode = (code: string, phone: string) => {
  return createHash('sha256').update(`${code}:${phone}`).digest('hex');
};

const addSeconds = (date: Date, seconds: number) => new Date(date.getTime() + seconds * 1000);
const secondsSince = (later: Date, earlier: Date) => Math.floor((later.getTime() - earlier.getTime()) / 1000);

type WalletOtpRequestResult =
  | { ok: true; expiresIn: number; cooldown: number }
  | { ok: false; error: 'PROFILE_NOT_FOUND' }
  | { ok: false; error: 'COOLDOWN'; retryAfter: number }
  | { ok: false; error: 'SEND_FAILED'; reason?: string }
  | { ok: false; error: string; retryAfter?: number };

type WalletOtpVerifyResult =
  | { ok: true }
  | { ok: false; error: 'PROFILE_NOT_FOUND' | 'OTP_NOT_FOUND' | 'OTP_EXPIRED' | 'OTP_MAX_ATTEMPTS' | 'OTP_INVALID' };

export async function requestWalletOtp(rawPhoneNumber: string) {
  const phoneNumber = sanitizePhone(rawPhoneNumber);
  const profile = await prisma.walletProfile.findUnique({
    where: { phoneNumber },
    include: { signup: true },
  });
  if (!profile) {
    return { ok: false, error: 'PROFILE_NOT_FOUND' } as WalletOtpRequestResult;
  }

  const now = new Date();
  const lastOtp = await prisma.walletOtpRequest.findFirst({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
  });

  if (lastOtp) {
    const secondsSinceLast = secondsSince(now, lastOtp.createdAt);
    if (secondsSinceLast < OTP_COOLDOWN_SECONDS) {
      return {
        ok: false,
        error: 'COOLDOWN',
        retryAfter: OTP_COOLDOWN_SECONDS - secondsSinceLast,
      } as WalletOtpRequestResult;
    }
  }

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code, phoneNumber);

  const expiresAt = addSeconds(now, OTP_TTL_SECONDS);

  await prisma.walletOtpRequest.create({
    data: {
      profileId: profile.id,
      destination: phoneNumber,
      codeHash,
      expiresAt,
      maxAttempts: OTP_MAX_ATTEMPTS,
    },
  });

  const sendResult = await sendWalletOtpTemplate(profile, { code });
  if (sendResult.status !== 'sent') {
    return {
      ok: false,
      error: 'SEND_FAILED',
      reason: 'reason' in sendResult ? sendResult.reason : sendResult.status,
    } as WalletOtpRequestResult;
  }

  return {
    ok: true,
    expiresIn: OTP_TTL_SECONDS,
    cooldown: OTP_COOLDOWN_SECONDS,
  } as WalletOtpRequestResult;
}

export async function verifyWalletOtp(rawPhoneNumber: string, code: string) {
  const phoneNumber = sanitizePhone(rawPhoneNumber);
  const profile = await prisma.walletProfile.findUnique({
    where: { phoneNumber },
  });
  if (!profile) {
    return { ok: false, error: 'PROFILE_NOT_FOUND' } as WalletOtpVerifyResult;
  }

  const otpRequest = await prisma.walletOtpRequest.findFirst({
    where: {
      profileId: profile.id,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRequest) {
    return { ok: false, error: 'OTP_NOT_FOUND' } as WalletOtpVerifyResult;
  }

  if (new Date().getTime() > otpRequest.expiresAt.getTime()) {
    await prisma.walletOtpRequest.update({
      where: { id: otpRequest.id },
      data: { consumedAt: new Date() },
    });
    return { ok: false, error: 'OTP_EXPIRED' } as WalletOtpVerifyResult;
  }

  if (otpRequest.attempts >= otpRequest.maxAttempts) {
    return { ok: false, error: 'OTP_MAX_ATTEMPTS' } as WalletOtpVerifyResult;
  }

  const hash = hashOtpCode(code, phoneNumber);
  if (hash !== otpRequest.codeHash) {
    await prisma.walletOtpRequest.update({
      where: { id: otpRequest.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: 'OTP_INVALID' } as WalletOtpVerifyResult;
  }

  await prisma.$transaction([
    prisma.walletOtpRequest.update({
      where: { id: otpRequest.id },
      data: { consumedAt: new Date() },
    }),
    prisma.walletProfile.update({
      where: { id: profile.id },
      data: { phoneVerified: true, lastLoginAt: new Date() },
    }),
  ]);

  return { ok: true } as WalletOtpVerifyResult;
}
