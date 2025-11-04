import type { Prisma } from '@prisma/client';
import {
  IZIPAY_API_ENDPOINT,
  IZIPAY_API_PASSWORD,
  IZIPAY_SITE_ID,
  ensureIzipayCredentials,
} from './config';

export type CreatePaymentInput = {
  orderId: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
    reference?: string;
    billingDetails?: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      mobilePhoneNumber?: string;
      country?: string;
      city?: string;
      address?: string;
      zipCode?: string;
    };
  };
  metadata?: Record<string, unknown>;
  formAction?: 'PAYMENT' | 'REGISTER_PAY';
  paymentMethods?: string[];
  locale?: string;
};

export type CreatePaymentResult = {
  formToken: string;
  answer: Record<string, unknown>;
  raw: Prisma.JsonValue;
};

function removeEmpty<T extends Record<string, unknown>>(input: T): T {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      const filtered = value.filter((item) => item !== undefined && item !== null);
      if (filtered.length === 0) continue;
      cleaned[key] = filtered;
      continue;
    }
    if (typeof value === 'object' && value && !(value instanceof Date)) {
      const nested = removeEmpty(value as Record<string, unknown>);
      if (Object.keys(nested).length === 0) continue;
      cleaned[key] = nested;
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned as T;
}

export async function createIzipayPayment(
  payload: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  ensureIzipayCredentials();

  const endpoint = `${IZIPAY_API_ENDPOINT.replace(/\/$/, '')}/V4/Charge/CreatePayment`;
  const authHeader = Buffer.from(`${IZIPAY_SITE_ID}:${IZIPAY_API_PASSWORD}`).toString('base64');

  const body = removeEmpty({
    ...payload,
    formAction: payload.formAction ?? 'PAYMENT',
    locale: payload.locale ?? 'es-PE',
    metadata: payload.metadata ?? undefined,
    customer: removeEmpty({
      ...payload.customer,
      billingDetails: payload.customer.billingDetails
        ? removeEmpty(payload.customer.billingDetails)
        : undefined,
    }),
    paymentMethods: payload.paymentMethods,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok || !json) {
    const answerBlock =
      json && typeof json.answer === 'object' && json.answer
        ? (json.answer as Record<string, unknown>)
        : undefined;
    const message =
      (answerBlock && typeof answerBlock.message === 'string' ? answerBlock.message : undefined) ||
      (typeof json?.answerMessage === 'string' ? (json.answerMessage as string) : undefined) ||
      response.statusText;
    throw new Error(
      `Izipay CreatePayment falló (${response.status} ${response.statusText}): ${message ?? 'sin detalle'}`,
    );
  }

  const answer = (json.answer as Record<string, unknown>) || {};
  const formToken = String(answer.formToken ?? answer['formToken'] ?? '');

  if (!formToken) {
    const status = typeof json.status === 'string' ? json.status : 'ERROR';
    const errorCode =
      (typeof answer.errorCode === 'string' && answer.errorCode) ||
      (typeof answer.detailedErrorCode === 'string' && answer.detailedErrorCode) ||
      status;
    const message =
      (typeof answer.message === 'string' && answer.message) ||
      (typeof answer.detailedErrorMessage === 'string' && answer.detailedErrorMessage) ||
      'sin detalle';
    throw new Error(`Izipay CreatePayment respondió ${errorCode}: ${message}`);
  }

  return {
    formToken,
    answer,
    raw: json as Prisma.JsonValue,
  };
}
