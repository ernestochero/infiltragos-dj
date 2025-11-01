import { randomBytes, randomUUID } from 'crypto';
import {
  Prisma,
  TicketEventStatus,
  TicketIssueStatus,
  TicketScanResult,
  TicketStatus,
  TicketTypeStatus,
} from '@prisma/client';
import prisma from '@core/prisma';
import type {
  EventCreateInput,
  EventUpdateInput,
  IssueTicketsInput,
  ScanTicketInput,
  TicketTypeInput,
} from './schemas';
import { TicketModuleError, assertOrFail } from './errors';
import { APP_BASE_URL, EMAIL_ENABLED } from './config';
import { sendTicketEmail } from './email';

export type TicketEventListItem = Awaited<ReturnType<typeof listEvents>>[number];

const QR_BASE = APP_BASE_URL.replace(/\/$/, '');

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base || `evento-${Date.now().toString(36)}`;
}

async function ensureUniqueSlug(slugCandidate: string) {
  let slug = slugCandidate;
  let attempt = 0;
  while (true) {
    const existing = await prisma.ticketEvent.findUnique({ where: { slug } });
    if (!existing) return slug;
    attempt += 1;
    const suffix = attempt < 5 ? `${attempt + 1}` : randomBytes(2).toString('hex');
    slug = `${slugCandidate}-${suffix}`.slice(0, 72);
  }
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function buildQrPayload(code: string) {
  return `${QR_BASE}/tickets/verify/${code}`;
}

function generateTicketCode(length = 10) {
  let code = '';
  while (code.length < length) {
    code += randomBytes(4)
      .toString('base64')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();
  }
  return code.slice(0, length);
}

export async function createEvent(input: EventCreateInput) {
  const slug = await ensureUniqueSlug(slugify(input.title));
  const event = await prisma.ticketEvent.create({
    data: {
      slug,
      title: input.title,
      summary: input.summary ?? null,
      description: input.description ?? null,
      startsAt: parseDate(input.startsAt),
      endsAt: parseDate(input.endsAt),
      venue: input.venue ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country ?? null,
      bannerUrl: input.bannerUrl ?? null,
      bannerKey: input.bannerKey ?? null,
      status: input.status ?? TicketEventStatus.DRAFT,
    },
  });
  return event;
}

export async function updateEvent(eventId: string, input: EventUpdateInput) {
  const existing = await prisma.ticketEvent.findUnique({ where: { id: eventId } });
  assertOrFail(existing, 'EVENT_NOT_FOUND', 'El evento no existe', 404);
  const data: Prisma.TicketEventUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.summary !== undefined) data.summary = input.summary ?? null;
  if (input.description !== undefined) data.description = input.description ?? null;
  if (input.startsAt !== undefined) data.startsAt = parseDate(input.startsAt);
  if (input.endsAt !== undefined) data.endsAt = parseDate(input.endsAt);
  if (input.venue !== undefined) data.venue = input.venue ?? null;
  if (input.address !== undefined) data.address = input.address ?? null;
  if (input.city !== undefined) data.city = input.city ?? null;
  if (input.country !== undefined) data.country = input.country ?? null;
  if (input.bannerUrl !== undefined) data.bannerUrl = input.bannerUrl ?? null;
  if (input.bannerKey !== undefined) data.bannerKey = input.bannerKey ?? null;
  if (input.status !== undefined) data.status = input.status;
  const event = await prisma.ticketEvent.update({
    where: { id: eventId },
    data,
    include: {
      _count: {
        select: { ticketTypes: true, tickets: true, issues: true },
      },
    },
  });
  return event;
}

export async function listEvents() {
  const events = await prisma.ticketEvent.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          ticketTypes: true,
          tickets: true,
          issues: true,
        },
      },
    },
  });

  if (!events.length) return [];

  const statusCounts = await prisma.ticket.groupBy({
    by: ['eventId', 'status'],
    where: { eventId: { in: events.map((e) => e.id) } },
    _count: { _all: true },
  });

  const statusMap = new Map<string, Partial<Record<TicketStatus, number>>>();
  statusCounts.forEach((row) => {
    const existing = statusMap.get(row.eventId) ?? {};
    existing[row.status as TicketStatus] = row._count._all;
    statusMap.set(row.eventId, existing);
  });

  return events.map((event) => ({
    ...event,
    stats: {
      totalTickets: event._count.tickets,
      redeemed: statusMap.get(event.id)?.[TicketStatus.REDEEMED] ?? 0,
      sent: statusMap.get(event.id)?.[TicketStatus.SENT] ?? 0,
      created: statusMap.get(event.id)?.[TicketStatus.CREATED] ?? 0,
      cancelled: statusMap.get(event.id)?.[TicketStatus.CANCELLED] ?? 0,
    },
  }));
}

export async function getEventDetail(eventId: string) {
  const event = await prisma.ticketEvent.findUnique({
    where: { id: eventId },
    include: {
      _count: { select: { ticketTypes: true, tickets: true, issues: true } },
    },
  });
  assertOrFail(event, 'EVENT_NOT_FOUND', 'Evento no encontrado', 404);

  const ticketTypeRows = await prisma.ticketType.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { tickets: true, issues: true } },
    },
  });

  const ticketTypes = await enrichTicketTypesWithStats(ticketTypeRows);

  const issues = await prisma.ticketIssue.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    include: {
      tickets: {
        select: {
          id: true,
          code: true,
          status: true,
          sequence: true,
          sentAt: true,
          validatedAt: true,
        },
        orderBy: { sequence: 'asc' },
      },
    },
    take: 100,
  });

  const ticketStatuses = await prisma.ticket.groupBy({
    by: ['status'],
    where: { eventId },
    _count: { _all: true },
  });

  const summary = {
    total: event._count.tickets,
    byStatus: ticketStatuses.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {}),
  };

  return { event, ticketTypes, issues, summary };
}

export async function createTicketType(eventId: string, input: TicketTypeInput) {
  const event = await prisma.ticketEvent.findUnique({ where: { id: eventId } });
  assertOrFail(event, 'EVENT_NOT_FOUND', 'Evento no encontrado', 404);
  const ticketType = await prisma.ticketType.create({
    data: {
      eventId,
      name: input.name,
      description: input.description ?? null,
      priceCents: Math.round(input.price * 100),
      currency: input.currency,
      totalQuantity: input.totalQuantity,
      perOrderLimit: input.perOrderLimit ?? null,
      saleStartsAt: parseDate(input.saleStartsAt),
      saleEndsAt: parseDate(input.saleEndsAt),
      validFrom: parseDate(input.validFrom),
      validUntil: parseDate(input.validUntil),
      status: input.status ?? TicketTypeStatus.DRAFT,
    },
  });
  return ticketType;
}

export async function listTicketTypes(eventId: string) {
  const event = await prisma.ticketEvent.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  assertOrFail(event, 'EVENT_NOT_FOUND', 'Evento no encontrado', 404);

  const types = await prisma.ticketType.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { tickets: true, issues: true } },
    },
  });

  if (!types.length) return [];

  return enrichTicketTypesWithStats(types);
}

async function enrichTicketTypesWithStats<
  T extends {
    id: string;
    _count: { tickets: number; issues: number };
  },
>(types: T[]) {
  if (!types.length) return [];

  const counts = await prisma.ticket.groupBy({
    by: ['ticketTypeId', 'status'],
    where: { ticketTypeId: { in: types.map((t) => t.id) } },
    _count: { _all: true },
  });

  const statusMap = new Map<string, Partial<Record<TicketStatus, number>>>();
  counts.forEach((row) => {
    if (!row.ticketTypeId) return;
    const target = statusMap.get(row.ticketTypeId) ?? {};
    target[row.status as TicketStatus] = row._count._all;
    statusMap.set(row.ticketTypeId, target);
  });

  return types.map((type) => ({
    ...type,
    stats: {
      total: type._count.tickets,
      redeemed: statusMap.get(type.id)?.[TicketStatus.REDEEMED] ?? 0,
      sent: statusMap.get(type.id)?.[TicketStatus.SENT] ?? 0,
      created: statusMap.get(type.id)?.[TicketStatus.CREATED] ?? 0,
      cancelled: statusMap.get(type.id)?.[TicketStatus.CANCELLED] ?? 0,
    },
  }));
}

export async function updateTicketType(
  ticketTypeId: string,
  input: Partial<TicketTypeInput>,
) {
  const existing = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
  assertOrFail(existing, 'TICKET_TYPE_NOT_FOUND', 'Tipo de ticket no existe', 404);

  const data: Prisma.TicketTypeUpdateInput = {
    name: input.name ?? undefined,
    description: input.description ?? null,
    priceCents: input.price !== undefined ? Math.round(input.price * 100) : undefined,
    currency: input.currency ?? undefined,
    totalQuantity: input.totalQuantity ?? undefined,
    perOrderLimit: input.perOrderLimit ?? null,
    saleStartsAt: input.saleStartsAt !== undefined ? parseDate(input.saleStartsAt) : undefined,
    saleEndsAt: input.saleEndsAt !== undefined ? parseDate(input.saleEndsAt) : undefined,
    validFrom: input.validFrom !== undefined ? parseDate(input.validFrom) : undefined,
    validUntil: input.validUntil !== undefined ? parseDate(input.validUntil) : undefined,
    status: input.status ?? undefined,
  };

  const updated = await prisma.ticketType.update({
    where: { id: ticketTypeId },
    data,
  });
  return updated;
}

export async function issueTickets(input: IssueTicketsInput) {
  if (input.sendEmail === false) {
    throw new TicketModuleError(
      'EMAIL_REQUIRED',
      'Para enviar tickets es necesario remitir el correo al comprador.',
      400,
    );
  }

  if (!EMAIL_ENABLED) {
    throw new TicketModuleError(
      'EMAIL_DISABLED',
      'Configura las variables SMTP (`TICKET_SMTP_*` y `TICKET_EMAIL_FROM`) antes de emitir tickets.',
      503,
    );
  }

  return prisma.$transaction(async (tx) => {
    const event = await tx.ticketEvent.findUnique({ where: { id: input.eventId } });
    assertOrFail(event, 'EVENT_NOT_FOUND', 'Evento no encontrado', 404);

    let ticketType: {
      id: string;
      name: string;
      description: string | null;
      totalQuantity: number;
      status: TicketTypeStatus;
      priceCents: number;
      currency: string;
    } | null = null;

    if (input.ticketTypeId) {
      ticketType = await tx.ticketType.findUnique({
        where: { id: input.ticketTypeId },
        select: {
          id: true,
          name: true,
          description: true,
          totalQuantity: true,
          status: true,
          priceCents: true,
          currency: true,
        },
      });
      assertOrFail(ticketType, 'TICKET_TYPE_NOT_FOUND', 'Tipo de ticket no existe', 404);
      assertOrFail(
        ticketType.status !== TicketTypeStatus.ARCHIVED,
        'TICKET_TYPE_ARCHIVED',
        'El tipo de ticket está archivado',
      );
      const activeCount = await tx.ticket.count({
        where: {
          ticketTypeId: ticketType.id,
          status: { not: TicketStatus.CANCELLED },
        },
      });
      const remaining = ticketType.totalQuantity - activeCount;
      assertOrFail(
        remaining >= input.quantity,
        'TICKET_STOCK_EXCEEDED',
        `No hay stock suficiente. Disponible: ${remaining}`,
      );
    }

    const now = new Date();
    const issue = await tx.ticketIssue.create({
      data: {
        eventId: event.id,
        ticketTypeId: ticketType?.id ?? null,
        purchaserName: input.recipientName,
        purchaserEmail: input.recipientEmail,
        purchaserPhone: input.recipientPhone ?? null,
        quantity: input.quantity,
        note: input.note ?? null,
        status: TicketIssueStatus.SENT,
        sentAt: now,
      },
    });

    const ticketsData = Array.from({ length: input.quantity }, (_, index) => {
      const code = generateTicketCode();
      return {
        id: randomUUID(),
        eventId: event.id,
        ticketTypeId: ticketType?.id ?? null,
        issueId: issue.id,
        sequence: index + 1,
        code,
        qrPayload: buildQrPayload(code),
        ownerName: input.recipientName,
        ownerEmail: input.recipientEmail,
        status: TicketStatus.SENT,
        sentAt: now,
      };
    });

    await tx.ticket.createMany({ data: ticketsData });

    try {
      await sendTicketEmail({
        toName: input.recipientName,
        toEmail: input.recipientEmail,
        event: event,
        ticketType: ticketType,
        tickets: ticketsData.map((ticket) => ({
          code: ticket.code,
          qrPayload: ticket.qrPayload,
          sequence: ticket.sequence,
          ownerName: ticket.ownerName,
        })),
        note: input.note ?? undefined,
      });
    } catch (error) {
      console.error('ticket-email-error', error);
      throw new TicketModuleError(
        'EMAIL_SEND_FAILED',
        error instanceof Error ? error.message : 'No pudimos enviar el correo',
        502,
      );
    }

    return {
      issue,
      tickets: ticketsData,
      event,
      ticketType,
      recipientEmail: input.recipientEmail,
    };
  });
}

export async function scanTicket(
  input: ScanTicketInput,
  scannerUserId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { code: input.code },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            venue: true,
          },
        },
        ticketType: {
          select: { id: true, name: true },
        },
      },
    });

    if (!ticket) {
      throw new TicketModuleError('TICKET_NOT_FOUND', 'Ticket no encontrado', 404);
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      await tx.ticketScan.create({
        data: {
          ticketId: ticket.id,
          result: TicketScanResult.CANCELLED,
          location: input.location ?? null,
          notes: null,
          scannedById: scannerUserId ?? null,
          device: input.device ?? null,
        },
      });
      return { ticket, result: TicketScanResult.CANCELLED };
    }

    if (ticket.status === TicketStatus.REDEEMED) {
      await tx.ticketScan.create({
        data: {
          ticketId: ticket.id,
          result: TicketScanResult.DUPLICATE,
          location: input.location ?? null,
          notes: null,
          scannedById: scannerUserId ?? null,
          device: input.device ?? null,
        },
      });
      return { ticket, result: TicketScanResult.DUPLICATE };
    }

    const updatedTicket = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.REDEEMED,
        validatedAt: new Date(),
        validatedById: scannerUserId ?? null,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            venue: true,
          },
        },
        ticketType: {
          select: { id: true, name: true },
        },
      },
    });

    await tx.ticketScan.create({
      data: {
        ticketId: updatedTicket.id,
        result: TicketScanResult.ACCEPTED,
        location: input.location ?? null,
        notes: null,
        scannedById: scannerUserId ?? null,
        device: input.device ?? null,
      },
    });

    return { ticket: updatedTicket, result: TicketScanResult.ACCEPTED };
  });
}
