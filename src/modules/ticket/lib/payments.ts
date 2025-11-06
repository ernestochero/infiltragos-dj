import crypto from 'node:crypto';
import { Prisma, TicketPaymentStatus, TicketStatus } from '@prisma/client';
import prisma from '@core/prisma';
import { createIzipayPayment } from '@payment/izipay/client';
import {
  IZIPAY_JS_URL,
  IZIPAY_PUBLIC_KEY,
  ensureIzipayCredentials,
} from '@payment/izipay/config';
import { TicketModuleError, assertOrFail } from './errors';
import { getPublicEvent } from './service';
import { issueTickets } from './service';

type PublicTicketTypeWithStats = Awaited<ReturnType<typeof getPublicEvent>>['ticketTypes'][number];

export type SmartformInitResult = {
  orderCode: string;
  formToken: string;
  amountCents: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  ticketType: {
    id: string;
    name: string;
    priceCents: number;
  };
  event: {
    id: string;
    slug: string;
    title: string;
  };
  publicKey: string;
  scriptUrl: string;
};

export type PaymentFulfillment = {
  paymentStatus: TicketPaymentStatus;
  providerStatus?: string | null;
  message?: string | null;
  orderCode: string;
  transactionUuid?: string | null;
  result?: {
    tickets: {
      code: string;
      qrPayload: string;
      sequence?: number | null;
    }[];
    recipientEmail: string;
    event: {
      id: string;
      title: string;
      startsAt?: string | null;
      venue?: string | null;
    };
    ticketType: {
      id: string;
      name: string;
      priceCents: number;
      currency: string;
    };
    buyerName: string;
  };
};

export type ProviderStatusPayload = {
  orderCode: string;
  providerStatus?: string | null;
  providerMessage?: string | null;
  transactionUuid?: string | null;
  rawAnswer?: unknown;
  origin: 'client' | 'webhook';
};

export async function createSmartformOrder(
  slug: string,
  input: {
    ticketTypeId: string;
    quantity: number;
    buyerName: string;
    buyerEmail: string;
    buyerPhone?: string | null;
  },
): Promise<SmartformInitResult> {
  ensureIzipayCredentials();

  const { event, ticketTypes } = await getPublicEvent(slug);
  const ticketType = ticketTypes.find((type) => type.id === input.ticketTypeId);
  assertOrFail(ticketType, 'TICKET_TYPE_NOT_AVAILABLE', 'Tipo de ticket no disponible', 404);

  validateAvailability(ticketType, input.quantity);

  const currency = normalizeCurrency(ticketType.currency);
  const amountCents = ticketType.priceCents * input.quantity;

  const payment = await createPaymentRecord({
    eventId: event.id,
    ticketTypeId: ticketType.id,
    quantity: input.quantity,
    amountCents,
    currency,
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    buyerPhone: input.buyerPhone ?? null,
    note: `Compra web evento ${event.slug}`,
  });

  try {
    const response = await createIzipayPayment({
      orderId: payment.orderCode,
      amount: amountCents,
      currency,
      locale: 'es-PE',
      paymentMethods: undefined,
      customer: {
        email: input.buyerEmail,
        reference: input.buyerName,
        billingDetails: {
          mobilePhoneNumber: input.buyerPhone ?? undefined,
        },
      },
      metadata: {
        eventId: event.id,
        eventSlug: event.slug,
        ticketTypeId: ticketType.id,
        ticketTypeName: ticketType.name,
        quantity: input.quantity,
      },
    });

    await prisma.ticketPayment.update({
      where: { id: payment.id },
      data: {
        status: TicketPaymentStatus.FORM_READY,
        formToken: response.formToken,
        rawResponse: response.raw as Prisma.InputJsonValue,
        providerStatus: extractOrderStatus(response.answer),
        providerMessage: null,
      },
    });

    return {
      orderCode: payment.orderCode,
      formToken: response.formToken,
      amountCents,
      currency,
      buyerName: input.buyerName,
      buyerEmail: input.buyerEmail,
      buyerPhone: input.buyerPhone ?? null,
      ticketType: {
        id: ticketType.id,
        name: ticketType.name,
        priceCents: ticketType.priceCents,
      },
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
      },
      publicKey: IZIPAY_PUBLIC_KEY,
      scriptUrl: IZIPAY_JS_URL,
    };
  } catch (error) {
    await prisma.ticketPayment.update({
      where: { id: payment.id },
      data: {
        status: TicketPaymentStatus.ERROR,
        lastError: error instanceof Error ? error.message : 'Error desconocido al generar el pago',
      },
    });
    console.error('[izipay:createSmartformOrder] error', error);
    throw new TicketModuleError(
      'IZIPAY_CREATE_PAYMENT_FAILED',
      'No pudimos iniciar el pago con Izipay. Intenta nuevamente.',
      502,
    );
  }
}

export async function refreshPaymentStatus(payload: ProviderStatusPayload): Promise<PaymentFulfillment> {
  ensureIzipayCredentials();

  const payment = await prisma.ticketPayment.findUnique({
    where: { orderCode: payload.orderCode },
    include: {
      ticketType: true,
      event: true,
      issue: {
        include: {
          tickets: true,
        },
      },
    },
  });

  assertOrFail(payment, 'PAYMENT_NOT_FOUND', 'Orden de pago no encontrada', 404);

  const rawAnswerObject =
    typeof payload.rawAnswer === 'object' && payload.rawAnswer
      ? (payload.rawAnswer as Record<string, unknown>)
      : undefined;

  const normalized = normalizeStatus(
    payload.providerStatus ??
      (rawAnswerObject
        ? extractOrderStatus(rawAnswerObject) || extractTransactionStatus(rawAnswerObject)
        : null),
  );

  const transactionUuid =
    payload.transactionUuid ??
    (rawAnswerObject ? extractTransactionUuid(rawAnswerObject) : undefined) ??
    payment.transactionUuid ??
    undefined;

  let rawResponseValue: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
  if (payload.rawAnswer === undefined) {
    rawResponseValue = undefined;
  } else if (payload.rawAnswer === null) {
    rawResponseValue = Prisma.JsonNull;
  } else {
    rawResponseValue = payload.rawAnswer as Prisma.InputJsonValue;
  }

  const updateData: Prisma.TicketPaymentUpdateInput = {
    providerStatus: payload.providerStatus ?? payment.providerStatus,
    providerMessage: payload.providerMessage ?? payment.providerMessage,
    transactionUuid,
    lastError: null,
  };

  if (rawResponseValue !== undefined) {
    updateData.rawResponse = rawResponseValue;
  }

  const baseResponse: PaymentFulfillment = {
    paymentStatus: payment.status,
    providerStatus: payload.providerStatus ?? payment.providerStatus,
    message: payload.providerMessage ?? payment.providerMessage,
    orderCode: payment.orderCode,
    transactionUuid,
    result: payment.issue ? mapIssueToResult(payment) : undefined,
  };

  if (normalized === TicketPaymentStatus.PAID || normalized === TicketPaymentStatus.FULFILLED) {
    return await handleSuccessfulPayment(payment.id, updateData, payload, baseResponse);
  }

  await prisma.ticketPayment.update({
    where: { id: payment.id },
    data: {
      ...updateData,
      status: normalized,
    },
  });

  return {
    ...baseResponse,
    paymentStatus: normalized,
  };
}

export async function loadPaymentFulfillment(orderCode: string): Promise<PaymentFulfillment> {
  const payment = await prisma.ticketPayment.findUnique({
    where: { orderCode },
    include: {
      ticketType: true,
      event: true,
      issue: {
        include: { tickets: true },
      },
    },
  });
  assertOrFail(payment, 'PAYMENT_NOT_FOUND', 'Orden de pago no encontrada', 404);
  return {
    paymentStatus: payment.status,
    providerStatus: payment.providerStatus,
    message: payment.providerMessage,
    orderCode: payment.orderCode,
    transactionUuid: payment.transactionUuid,
    result: payment.issue ? mapIssueToResult(payment) : undefined,
  };
}

async function handleSuccessfulPayment(
  paymentId: string,
  updateData: Prisma.TicketPaymentUpdateInput,
  payload: ProviderStatusPayload,
  baseResponse: PaymentFulfillment,
): Promise<PaymentFulfillment> {
  const payment = await prisma.ticketPayment.findUnique({
    where: { id: paymentId },
    include: {
      ticketType: true,
      event: true,
      issue: {
        include: { tickets: true },
      },
    },
  });
  if (!payment) {
    throw new TicketModuleError('PAYMENT_NOT_FOUND', 'Orden de pago no encontrada', 404);
  }

  if (payment.issueId && payment.issue) {
    await prisma.ticketPayment.update({
      where: { id: paymentId },
      data: {
        ...updateData,
        status: TicketPaymentStatus.FULFILLED,
      },
    });
    return {
      ...baseResponse,
      paymentStatus: TicketPaymentStatus.FULFILLED,
      result: mapIssueToResult(payment),
    };
  }

  const updateResult = await prisma.ticketPayment.updateMany({
    where: {
      id: paymentId,
      issueId: null,
      status: {
        in: [TicketPaymentStatus.PENDING, TicketPaymentStatus.FORM_READY, TicketPaymentStatus.PAID],
      },
    },
    data: {
      ...updateData,
      status: TicketPaymentStatus.PAID,
    },
  });

  if (updateResult.count === 0) {
    const refreshed = await prisma.ticketPayment.findUnique({
      where: { id: paymentId },
      include: {
        ticketType: true,
        event: true,
        issue: {
          include: { tickets: true },
        },
      },
    });
    if (!refreshed) {
      throw new TicketModuleError('PAYMENT_NOT_FOUND', 'Orden de pago no encontrada', 404);
    }
    return {
      ...baseResponse,
      paymentStatus: refreshed.status,
      result: refreshed.issue ? mapIssueToResult(refreshed) : undefined,
      transactionUuid: refreshed.transactionUuid,
      providerStatus: refreshed.providerStatus,
      message: refreshed.providerMessage,
    };
  }

  try {
    const fulfillment = await issueTickets({
      eventId: payment.eventId,
      ticketTypeId: payment.ticketTypeId ?? undefined,
      recipientName: payment.buyerName,
      recipientEmail: payment.buyerEmail,
      recipientPhone: payment.buyerPhone ?? undefined,
      quantity: payment.quantity,
      note: `Pago Izipay ${payment.orderCode}`,
      sendEmail: true,
    });

    await prisma.ticketPayment.update({
      where: { id: payment.id },
      data: {
        ...updateData,
        status: TicketPaymentStatus.FULFILLED,
        issue: { connect: { id: fulfillment.issue.id } },
      },
    });

    return {
      paymentStatus: TicketPaymentStatus.FULFILLED,
      providerStatus: payload.providerStatus ?? payment.providerStatus,
      message: payload.providerMessage ?? payment.providerMessage,
      orderCode: payment.orderCode,
      transactionUuid: payload.transactionUuid ?? payment.transactionUuid,
      result: {
        tickets: fulfillment.tickets.map((ticket) => ({
          code: ticket.code,
          qrPayload: ticket.qrPayload,
          sequence: ticket.sequence,
        })),
        recipientEmail: fulfillment.recipientEmail,
        event: {
          id: fulfillment.event.id,
          title: fulfillment.event.title,
          startsAt: fulfillment.event.startsAt?.toISOString() ?? null,
          venue: fulfillment.event.venue ?? null,
        },
        ticketType: {
          id: fulfillment.ticketType?.id ?? payment.ticketTypeId ?? '',
          name: fulfillment.ticketType?.name ?? payment.ticketType?.name ?? 'Ticket',
          priceCents: fulfillment.ticketType?.priceCents ?? payment.ticketType?.priceCents ?? 0,
          currency: normalizeCurrency(
            fulfillment.ticketType?.currency ?? payment.ticketType?.currency ?? null,
          ),
        },
        buyerName: fulfillment.issue.purchaserName,
      },
    };
  } catch (error) {
    await prisma.ticketPayment.update({
      where: { id: payment.id },
      data: {
        ...updateData,
        status: TicketPaymentStatus.PAID,
        lastError: error instanceof Error ? error.message : 'No se pudieron emitir los tickets',
      },
    });
    console.error('[izipay:fulfillment] issueTickets failed', error);
    throw error;
  }
}

type PaymentRecordInput = {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  amountCents: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  note: string;
};

async function createPaymentRecord(input: PaymentRecordInput) {
  let attempt = 0;
  while (attempt < 5) {
    const orderCode = buildOrderCode(input.eventId, attempt);
    try {
      return await prisma.ticketPayment.create({
        data: {
          eventId: input.eventId,
          ticketTypeId: input.ticketTypeId,
          quantity: input.quantity,
          amountCents: input.amountCents,
          currency: input.currency,
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail,
          buyerPhone: input.buyerPhone,
          orderCode,
          providerMessage: null,
          providerStatus: null,
          status: TicketPaymentStatus.PENDING,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        Array.isArray(error.meta?.target) &&
        error.meta?.target.includes('orderCode')
      ) {
        attempt += 1;
        continue;
      }
      throw error;
    }
  }
  throw new TicketModuleError(
    'PAYMENT_CREATION_FAILED',
    'No pudimos generar la orden de pago. Intenta de nuevo.',
    500,
  );
}

function buildOrderCode(eventId: string, attempt: number) {
  const base = eventId.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6) || 'INFIL';
  const nonce = crypto.randomBytes(2 + attempt).toString('hex').toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase();
  return `${base}-${stamp}-${nonce}`.slice(0, 40);
}

function validateAvailability(ticketType: PublicTicketTypeWithStats, quantity: number) {
  const sold = ticketType.stats.total - ticketType.stats.cancelled;
  const remaining = Math.max(ticketType.totalQuantity - sold, 0);
  assertOrFail(
    remaining >= quantity,
    'NOT_ENOUGH_STOCK',
    `No hay stock suficiente para esta compra. Disponibles: ${remaining}`,
    400,
  );
  if (ticketType.perOrderLimit && quantity > ticketType.perOrderLimit) {
    throw new TicketModuleError(
      'PER_ORDER_LIMIT_EXCEEDED',
      `Solo puedes comprar ${ticketType.perOrderLimit} tickets por pedido`,
      400,
    );
  }
}

export function extractOrderCode(answer: Record<string, unknown>) {
  if (typeof answer.orderId === 'string') return answer.orderId;
  const orderDetails = answer.orderDetails as Record<string, unknown> | undefined;
  if (orderDetails && typeof orderDetails.orderId === 'string') return orderDetails.orderId;
  const payment = answer.payment as Record<string, unknown> | undefined;
  if (payment && typeof payment.orderId === 'string') return payment.orderId;
  if (payment && typeof payment.orderDetails === 'object' && payment.orderDetails) {
    const details = payment.orderDetails as Record<string, unknown>;
    if (typeof details.orderId === 'string') return details.orderId;
  }
  return undefined;
}

function extractOrderStatus(answer: Record<string, unknown>) {
  const status = (answer.orderStatus ?? answer.status) as string | undefined;
  if (status) return status;
  const payment = answer.payment as Record<string, unknown> | undefined;
  if (payment && typeof payment.orderStatus === 'string') return payment.orderStatus;
  return undefined;
}

function normalizeCurrency(input: string | null | undefined) {
  const value = (input ?? '').trim().toUpperCase();
  if (!value) return 'PEN';
  if (value === 'SOL' || value === 'SOLES' || value === 'S/.' || value === 'S/.') {
    return 'PEN';
  }
  return value;
}

function extractTransactionStatus(answer: Record<string, unknown>) {
  if (typeof answer.transactionStatus === 'string') return answer.transactionStatus;
  const transactions = answer.transactions;
  if (Array.isArray(transactions) && transactions.length > 0) {
    const latest = transactions[transactions.length - 1];
    if (latest && typeof latest.status === 'string') return latest.status;
  }
  const payment = answer.payment as Record<string, unknown> | undefined;
  if (payment && Array.isArray(payment.transactions) && payment.transactions.length > 0) {
    const latest = payment.transactions[payment.transactions.length - 1];
    if (latest && typeof latest.status === 'string') return latest.status;
  }
  return undefined;
}

function extractTransactionUuid(answer: Record<string, unknown>) {
  if (typeof answer.transactionUuid === 'string') return answer.transactionUuid;
  const transactions = answer.transactions;
  if (Array.isArray(transactions) && transactions.length > 0) {
    const latest = transactions[transactions.length - 1];
    if (latest && typeof latest.uuid === 'string') return latest.uuid;
    if (latest && typeof latest.uuidTransaction === 'string') return latest.uuidTransaction;
  }
  const payment = answer.payment as Record<string, unknown> | undefined;
  if (payment && Array.isArray(payment.transactions) && payment.transactions.length > 0) {
    const latest = payment.transactions[payment.transactions.length - 1];
    if (latest && typeof latest.uuid === 'string') return latest.uuid;
    if (latest && typeof latest.uuidTransaction === 'string') return latest.uuidTransaction;
  }
  return undefined;
}

function normalizeStatus(rawStatus?: string | null): TicketPaymentStatus {
  if (!rawStatus) return TicketPaymentStatus.PENDING;
  const value = rawStatus.toUpperCase();
  if (['PAID', 'CAPTURED', 'CAPTURE', 'AUTHORISED', 'AUTHORIZED'].includes(value)) {
    return TicketPaymentStatus.PAID;
  }
  if (['CANCELLED', 'CANCELED', 'ABANDONED'].includes(value)) {
    return TicketPaymentStatus.CANCELLED;
  }
  if (['DECLINED', 'REFUSED', 'FAILED', 'ERROR'].includes(value)) {
    return TicketPaymentStatus.DECLINED;
  }
  if (['FALLBACK', 'WARNING'].includes(value)) {
    return TicketPaymentStatus.ERROR;
  }
  if (value === 'FULFILLED') return TicketPaymentStatus.FULFILLED;
  return TicketPaymentStatus.PENDING;
}

function mapIssueToResult(
  payment: Prisma.TicketPaymentGetPayload<{
    include: {
      ticketType: true;
      event: true;
      issue: { include: { tickets: true } };
    };
  }>,
) {
  if (!payment.issue) return undefined;
  return {
    tickets: payment.issue.tickets
      .filter((ticket) => ticket.status !== TicketStatus.CANCELLED)
      .map((ticket) => ({
        code: ticket.code,
        qrPayload: ticket.qrPayload,
        sequence: ticket.sequence,
      })),
    recipientEmail: payment.buyerEmail,
    event: {
      id: payment.event.id,
      title: payment.event.title,
      startsAt: payment.event.startsAt?.toISOString() ?? null,
      venue: payment.event.venue ?? null,
    },
    ticketType: {
      id: payment.ticketType?.id ?? payment.ticketTypeId ?? '',
      name: payment.ticketType?.name ?? 'Ticket',
      priceCents: payment.ticketType?.priceCents ?? 0,
      currency: normalizeCurrency(payment.ticketType?.currency ?? null),
    },
    buyerName: payment.buyerName,
  };
}
