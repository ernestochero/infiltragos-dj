import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import type { TicketEvent, TicketType } from '@prisma/client';
import {
  DEFAULT_QR_SIZE,
  EMAIL_ENABLED,
  TICKET_EMAIL_FROM,
  TICKET_EMAIL_REPLY_TO,
  TICKET_SMTP_HOST,
  TICKET_SMTP_PASS,
  TICKET_SMTP_PORT,
  TICKET_SMTP_USER,
} from './config';

type TicketEmailTicket = {
  code: string;
  qrPayload: string;
  sequence?: number | null;
  ownerName: string;
};

type TicketEmailPayload = {
  toName: string;
  toEmail: string;
  event: Pick<
    TicketEvent,
    | 'id'
    | 'title'
    | 'summary'
    | 'description'
    | 'startsAt'
    | 'endsAt'
    | 'venue'
    | 'address'
    | 'city'
    | 'country'
    | 'bannerUrl'
  >;
  ticketType?: Pick<TicketType, 'name' | 'description' | 'priceCents' | 'currency'> | null;
  tickets: TicketEmailTicket[];
  note?: string;
};

let transporter: nodemailer.Transporter | null = null;

async function getTransport(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: TICKET_SMTP_HOST,
    port: TICKET_SMTP_PORT || 587,
    secure: TICKET_SMTP_PORT === 465,
    auth: {
      user: TICKET_SMTP_USER,
      pass: TICKET_SMTP_PASS,
    },
  });
  return transporter;
}

const EMAIL_TIMEZONE = 'America/Lima';

function formatDate(value?: Date | null) {
  if (!value) return '';
  return value.toLocaleString('es-PE', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: EMAIL_TIMEZONE,
  });
}

function toCurrency(amountInCents: number, currency: string) {
  return Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amountInCents / 100);
}

function buildHtml(payload: TicketEmailPayload, cidByCode: Map<string, string>) {
  const starts = formatDate(payload.event.startsAt);
  const ends = formatDate(payload.event.endsAt);
  const ticketInfo =
    payload.ticketType && payload.ticketType.priceCents >= 0
      ? `${payload.ticketType.name} · ${toCurrency(
          payload.ticketType.priceCents,
          payload.ticketType.currency,
        )}`
      : payload.ticketType?.name;

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6">
    <h1 style="font-size:22px;margin-bottom:8px">Hola ${payload.toName} 👋</h1>
    <p>Gracias por confiar en Infiltragos. Aquí encuentras tus accesos para <strong>${payload.event.title}</strong>.</p>
    ${
      payload.event.bannerUrl
        ? `<div style="margin:16px 0"><img src="${payload.event.bannerUrl}" alt="${payload.event.title}" style="width:100%;max-width:560px;border-radius:12px"/></div>`
        : ''
    }
    <section style="background:#0f172a0d;border-radius:12px;padding:16px;margin-bottom:16px">
      ${
        ticketInfo
          ? `<p style="margin:0 0 8px 0"><strong>Tipo de ticket:</strong> ${ticketInfo}</p>`
          : ''
      }
      ${starts ? `<p style="margin:0 0 8px 0"><strong>Inicio:</strong> ${starts}</p>` : ''}
      ${ends ? `<p style="margin:0 0 8px 0"><strong>Fin:</strong> ${ends}</p>` : ''}
      ${
        payload.event.venue
          ? `<p style="margin:0 0 4px 0"><strong>Venue:</strong> ${payload.event.venue}</p>`
          : ''
      }
      ${
        payload.event.address
          ? `<p style="margin:0 0 4px 0"><strong>Dirección:</strong> ${payload.event.address}</p>`
          : ''
      }
      ${
        payload.event.city
          ? `<p style="margin:0 0 0 0"><strong>Ciudad:</strong> ${payload.event.city}${
              payload.event.country ? `, ${payload.event.country}` : ''
            }</p>`
          : ''
      }
    </section>
    ${
      payload.note
        ? `<p style="background:#f8fafc;border-left:4px solid #6366f1;padding:12px;border-radius:8px"><strong>Nota:</strong> ${payload.note}</p>`
        : ''
    }
    <h2 style="font-size:18px;margin:24px 0 12px">Tus tickets (${payload.tickets.length})</h2>
    ${payload.tickets
      .map(
        (ticket) => `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px">
        <p style="margin:0 0 4px 0"><strong>Código:</strong> ${ticket.code}</p>
        ${
          ticket.sequence
            ? `<p style="margin:0 0 8px 0"><strong>Ticket:</strong> #${ticket.sequence}</p>`
            : ''
        }
        <p style="margin:0 0 12px 0">Presenta este QR en el ingreso.</p>
        <div style="text-align:center">
          <img src="cid:${cidByCode.get(ticket.code)}" alt="QR ${ticket.code}" style="width:220px;height:220px;border-radius:12px;border:6px solid #e2e8f0;background:#fff;padding:12px"/>
        </div>
      </div>`,
      )
      .join('')}
    <p style="font-size:13px;color:#64748b;margin-top:24px">
      Si tienes cualquier consulta, responde este correo y estaremos felices de ayudarte.
    </p>
  </div>`;
}

function buildText(payload: TicketEmailPayload) {
  const starts = formatDate(payload.event.startsAt);
  const ends = formatDate(payload.event.endsAt);
  const lines = [
    `Hola ${payload.toName}`,
    `Tus tickets para ${payload.event.title}`,
    starts ? `Inicio: ${starts}` : undefined,
    ends ? `Fin: ${ends}` : undefined,
    payload.event.venue ? `Lugar: ${payload.event.venue}` : undefined,
    payload.event.address ? `Dirección: ${payload.event.address}` : undefined,
    payload.event.city
      ? `Ciudad: ${payload.event.city}${payload.event.country ? `, ${payload.event.country}` : ''}`
      : undefined,
    payload.note ? `Nota: ${payload.note}` : undefined,
    '',
    ...payload.tickets.map((ticket, index) => {
      const seq = ticket.sequence ? ` (#${ticket.sequence})` : '';
      return `Ticket ${index + 1}${seq} · Código: ${ticket.code}`;
    }),
    '',
    'Presenta cualquiera de los QR adjuntos para ingresar.',
  ].filter(Boolean);
  return lines.join('\n');
}

export async function sendTicketEmail(payload: TicketEmailPayload) {
  if (!EMAIL_ENABLED) {
    return { delivered: false as const, skipped: true as const };
  }

  const transport = await getTransport();

  const cidByCode = new Map<string, string>();
  const attachments = await Promise.all(
    payload.tickets.map(async (ticket) => {
      const cid = `qr-${ticket.code}`;
      cidByCode.set(ticket.code, cid);
      const dataUrl = await QRCode.toDataURL(ticket.qrPayload, {
        width: DEFAULT_QR_SIZE,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      const parts = dataUrl.split(',');
      const base64 = parts[1];
      if (!base64) {
        throw new Error(
          `Invalid QR code data URL format for ticket ${ticket.code}`,
        );
      }
      return {
        filename: `ticket-${ticket.code}.png`,
        content: Buffer.from(base64, 'base64'),
        cid,
      };
    }),
  );

  const subject = `Tus tickets para ${payload.event.title}`;
  const html = buildHtml(payload, cidByCode);
  const text = buildText(payload);

  await transport.sendMail({
    from: TICKET_EMAIL_FROM,
    to: `${payload.toName} <${payload.toEmail}>`,
    replyTo: TICKET_EMAIL_REPLY_TO || undefined,
    subject,
    html,
    text,
    attachments,
  });

  return { delivered: true as const, skipped: false as const };
}
