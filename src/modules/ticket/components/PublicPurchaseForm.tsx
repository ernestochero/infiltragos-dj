'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TicketDownloadCard, { downloadTicketCard } from '@ticket/components/TicketDownloadCard';

type PurchaseTicketType = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  available: number;
};

type PurchaseResult = {
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

type Props = {
  slug: string;
  ticketTypes: PurchaseTicketType[];
};

export default function PublicPurchaseForm({ slug, ticketTypes }: Props) {
  const [selectedTypeId, setSelectedTypeId] = useState(ticketTypes[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [showTicketsInline, setShowTicketsInline] = useState(false);

  const selectedType = useMemo(
    () => ticketTypes.find((type) => type.id === selectedTypeId) ?? ticketTypes[0],
    [ticketTypes, selectedTypeId],
  );

  const maxQuantity = selectedType ? Math.max(selectedType.available, 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) {
      setError('Selecciona un tipo de ticket disponible');
      return;
    }
    if (!buyerName.trim() || !buyerEmail.trim()) {
      setError('Completa tu nombre y correo electrónico');
      return;
    }
    if (maxQuantity === 0) {
      setError('No hay stock disponible para este ticket');
      return;
    }
    if (quantity > maxQuantity) {
      setError(`Solo hay ${maxQuantity} tickets disponibles para esta categoría`);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/events/${slug}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketTypeId: selectedType.id,
          quantity,
          buyerName,
          buyerEmail,
          buyerPhone: buyerPhone || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'No pudimos completar tu compra');
      }
      const data = (await res.json()) as PurchaseResult;
      setResult({ ...data, buyerName });
      setShowTicketsInline(true);
      setExpandedTicket(null);
      setBuyerName('');
      setBuyerEmail('');
      setBuyerPhone('');
      setQuantity(1);
      setSelectedTypeId(ticketTypes[0]?.id ?? selectedType.id ?? '');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cardRefs.current = {};
  }, [result]);

  if (ticketTypes.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-center text-sm text-gray-300">
        Los tickets estarán disponibles muy pronto. Mantente atento.
      </div>
    );
  }

  const total = selectedType ? (selectedType.priceCents / 100) * quantity : 0;

  return (
    <div className="space-y-4">
      {!showTicketsInline && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-5">
        <div>
          <p className="text-sm font-semibold text-gray-100">Compra tus entradas</p>
          <p className="text-xs text-gray-400">
            El pago se procesa con Izipay. Por ahora simulamos el cobro para probar el flujo.
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-300">Tipo de ticket</label>
          <select
            value={selectedType?.id}
            onChange={(e) => {
              setSelectedTypeId(e.target.value);
              setQuantity(1);
            }}
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
          >
            {ticketTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} · {formatPrice(type.priceCents, type.currency)} {type.available <= 0 ? '(Agotado)' : ''}
              </option>
            ))}
          </select>
          {selectedType && (
            <p className="text-xs text-gray-400">
              {selectedType.description || ''} {selectedType.available} disponibles
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-gray-300">Nombre completo</label>
            <input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
              placeholder="Tu nombre"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-300">Correo electrónico</label>
            <input
              type="email"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
              placeholder="email@dominio.com"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-300">Teléfono / WhatsApp</label>
            <input
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
              placeholder="999 999 999"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-300">Cantidad</label>
            <input
              type="number"
              min={1}
              max={maxQuantity || 1}
              value={quantity}
              onChange={(e) => {
                const val = Number.parseInt(e.target.value, 10);
                setQuantity(Number.isNaN(val) ? 1 : Math.max(1, Math.min(val, maxQuantity || 1)));
              }}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            />
            <p className="text-xs text-gray-400">Disponibles: {maxQuantity}</p>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100">
          <div className="flex items-center justify-between">
            <span>Total</span>
            <strong>{formatPrice(total * 100, selectedType?.currency || 'PEN')}</strong>
          </div>
          <p className="text-xs text-gray-400">
            Al completar la compra enviaremos los tickets y QRs a tu correo electrónico. Preséntalos en la puerta para
            ingresar.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedType || maxQuantity === 0}
          className="w-full rounded-md bg-[linear-gradient(120deg,#ed1c24,#f7931e)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[rgba(237,28,36,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Procesando…' : 'Pagar con Izipay'}
        </button>
        </form>
      )}

      {showTicketsInline && result && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-5">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <p className="font-semibold">¡Compra confirmada!</p>
            <p className="text-xs text-emerald-50">
              Te enviamos los QR a <strong>{result.recipientEmail}</strong>. También puedes descargarlos aquí.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-100 hover:bg-white/10 disabled:opacity-60"
            >
              {downloadingAll ? 'Descargando…' : 'Descargar todos'}
            </button>
          </div>
          <div className="space-y-3">
            {result.tickets.map((ticket, index) => (
              <div key={ticket.code} className="rounded-lg border border-white/10 bg-black/30">
                <button
                  type="button"
                  onClick={() => setExpandedTicket((prev) => (prev === ticket.code ? null : ticket.code))}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-gray-100 hover:bg-white/5"
                >
                  <span>
                    Ticket #{ticket.sequence ?? index + 1} · <span className="text-xs text-gray-400">{ticket.code}</span>
                  </span>
                  <span className="text-xs text-gray-400">{expandedTicket === ticket.code ? 'Ocultar' : 'Ver'}</span>
                </button>
                {(expandedTicket === ticket.code || result.tickets.length === 1) && (
                  <div className="border-t border-white/10 p-4 overflow-x-auto">
                    <TicketDownloadCard
                      ticket={ticket}
                      event={result.event}
                      ticketType={result.ticketType}
                      buyerName={result.buyerName}
                      width={640}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md bg-[linear-gradient(120deg,#ed1c24,#f7931e)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[rgba(237,28,36,0.35)] transition hover:opacity-95"
            >
              Comprar más entradas
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="absolute left-[-9999px] top-0 w-[600px]" aria-hidden="true">
          {result.tickets.map((ticket) => (
            <TicketDownloadCard
              key={`hidden-${ticket.code}`}
              ticket={ticket}
              event={result.event}
              ticketType={result.ticketType}
              buyerName={result.buyerName}
              className="mb-4"
              hideDownloadButton
              refCallback={(node) => {
                cardRefs.current[ticket.code] = node;
              }}
              width={640}
            />
          ))}
        </div>
      )}

    </div>
  );

  async function handleDownloadAll() {
    if (!result) return;
    try {
      setDownloadingAll(true);
      for (const ticket of result.tickets) {
        const node = cardRefs.current[ticket.code];
        if (node) {
          await downloadTicketCard(node, ticket.code);
        }
      }
    } finally {
      setDownloadingAll(false);
    }
  }

  function resetForm() {
    setShowTicketsInline(false);
    setResult(null);
    setExpandedTicket(null);
    setBuyerName('');
    setBuyerEmail('');
    setBuyerPhone('');
    setQuantity(1);
    setSelectedTypeId(ticketTypes[0]?.id ?? '');
  }
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: currency || 'PEN',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
