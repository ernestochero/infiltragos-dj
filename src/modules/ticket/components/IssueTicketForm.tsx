'use client';

import { useMemo, useState } from 'react';

type TicketTypeOption = {
  id: string;
  name: string;
  totalQuantity?: number;
  stats?: {
    emitted: number;
    redeemed: number;
    cancelled: number;
  };
};

type IssueResult = {
  code: string;
  qrPayload: string;
  sequence?: number | null;
};

type Props = {
  eventId: string;
  ticketTypes: TicketTypeOption[];
  onIssued?: () => void;
};

function getRemaining(ticketType?: TicketTypeOption) {
  if (
    !ticketType ||
    typeof ticketType.totalQuantity !== 'number' ||
    !ticketType.stats
  ) {
    return undefined;
  }
  const used = ticketType.stats.emitted - ticketType.stats.cancelled;
  return Math.max(ticketType.totalQuantity - used, 0);
}

export default function IssueTicketForm({ eventId, ticketTypes, onIssued }: Props) {
  const [ticketTypeId, setTicketTypeId] = useState(ticketTypes[0]?.id ?? '');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<IssueResult[] | null>(null);
  const [successRecipient, setSuccessRecipient] = useState<string | null>(null);

  const selected = useMemo(
    () => ticketTypes.find((type) => type.id === ticketTypeId),
    [ticketTypeId, ticketTypes],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recipientName || !recipientEmail) {
      setError('Completa nombre y correo del comprador');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tickets/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ticketTypeId: ticketTypeId || undefined,
          recipientName,
          recipientEmail,
          recipientPhone: recipientPhone || undefined,
          quantity,
          note: note || undefined,
          sendEmail: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'No se pudo emitir los tickets');
      }
      const data = (await res.json()) as {
        tickets: IssueResult[];
        recipientEmail?: string;
      };
      setIssued(data.tickets);
      setSuccessRecipient(data.recipientEmail ?? recipientEmail);
      setRecipientPhone('');
      setNote('');
      setQuantity(1);
      onIssued?.();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setIssued(null);
      setSuccessRecipient(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-100">Enviar tickets</h3>
          <p className="text-xs text-gray-400">Genera códigos únicos y opcionalmente envía por email.</p>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Tipo de ticket
          </label>
          <select
            value={ticketTypeId}
            onChange={(e) => setTicketTypeId(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
          >
            <option value="">Sin tipo (general)</option>
            {ticketTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          {selected && (
            <p className="mt-1 text-xs text-gray-400">
              Disponibles: {getRemaining(selected) ?? '—'}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Nombre completo
          </label>
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="Nombre completo"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Correo electrónico
          </label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="correo@cliente.com"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Teléfono / WhatsApp
          </label>
          <input
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="+51 999 999 999"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Cantidad
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(e) => {
              const value = Number.parseInt(e.target.value, 10);
              setQuantity(Number.isNaN(value) ? 1 : value);
            }}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Nota interna
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="Info adicional para enviar en el correo"
          />
        </div>
        <div className="sm:col-span-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-300">
          Enviaremos los tickets automáticamente por correo electrónico al completar este formulario.
        </div>

        <div className="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {submitting ? 'Procesando…' : 'Enviar tickets'}
          </button>
        </div>
      </form>

      {issued && issued.length > 0 && (
        <div className="space-y-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p className="font-semibold">Tickets generados ({issued.length})</p>
          {successRecipient && (
            <p className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              Enviamos los tickets a <strong>{successRecipient}</strong>. Pide al cliente revisar bandeja y spam.
            </p>
          )}
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {issued.map((ticket) => (
              <li
                key={ticket.code}
                className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2"
              >
                <div>
                  <p className="text-xs text-gray-400">Código</p>
                  <p className="font-semibold text-white">{ticket.code}</p>
                  {ticket.sequence && (
                    <p className="text-xs text-gray-400">Ticket #{ticket.sequence}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                      void navigator.clipboard.writeText(ticket.qrPayload);
                    }
                  }}
                  className="rounded-md border border-white/10 px-2 py-1 text-xs text-emerald-200 hover:bg-white/10"
                >
                  Copiar QR
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
