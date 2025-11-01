import { notFound } from 'next/navigation';
import prisma from '@core/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function statusConfig(status: string) {
  switch (status) {
    case 'REDEEMED':
      return {
        title: 'Ticket usado',
        tone: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
        description: 'Este ticket ya fue validado anteriormente. Consulta con el staff si tienes dudas.',
      };
    case 'CANCELLED':
      return {
        title: 'Ticket cancelado',
        tone: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
        description: 'El ingreso está bloqueado. Ponte en contacto con la organización.',
      };
    default:
      return {
        title: 'Ticket válido',
        tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
        description: 'Presenta este ticket al staff de Infiltragos para ingresar al evento.',
      };
  }
}

function formatDate(value: Date | null | undefined) {
  if (!value) return null;
  return value.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function VerifyTicketPage({ params }: { params: { code: string } }) {
  const ticket = await prisma.ticket.findUnique({
    where: { code: params.code },
    include: {
      event: {
        select: {
          title: true,
          startsAt: true,
          venue: true,
          bannerUrl: true,
        },
      },
      ticketType: {
        select: { name: true },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  const status = statusConfig(ticket.status);
  const validatedAt = formatDate(ticket.validatedAt);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-6 text-center text-slate-50">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl">
        {ticket.event.bannerUrl && (
          <div className="overflow-hidden rounded-lg border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ticket.event.bannerUrl} alt={ticket.event.title} className="h-48 w-full object-cover" />
          </div>
        )}
        <div className={`rounded-xl border px-4 py-3 text-sm ${status.tone}`}>
          <h1 className="text-xl font-semibold">{status.title}</h1>
          <p className="mt-1 text-xs">{status.description}</p>
        </div>
        <div className="space-y-4 text-left text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Evento</p>
            <p className="text-base font-semibold text-slate-100">{ticket.event.title}</p>
            <p className="text-xs text-slate-400">
              {ticket.event.venue ?? 'Venue por confirmar'} ·{' '}
              {formatDate(ticket.event.startsAt) ?? 'Pronto'}
            </p>
          </div>
          <div className="grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Código</p>
              <p className="font-semibold text-slate-100">{ticket.code}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Ticket</p>
              <p className="font-semibold text-slate-100">
                {ticket.ticketType?.name ?? 'General'}
              </p>
            </div>
            {validatedAt && (
              <div className="sm:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Validado</p>
                <p className="text-sm text-slate-100">{validatedAt}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Si este ticket es tuyo y encuentras algún inconveniente, responde el correo del envío
            o comunícate con el staff de Infiltragos.
          </p>
        </div>
      </div>
    </main>
  );
}
