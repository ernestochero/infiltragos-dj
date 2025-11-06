'use client';

import { useEffect, useMemo, useState } from 'react';

type TicketTypeEditable = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  totalQuantity: number;
  perOrderLimit?: number | null;
  saleEndsAt?: string | null;
  status: 'DRAFT' | 'ON_SALE' | 'ARCHIVED';
};

type Props = {
  eventId: string;
  onCreated?: () => void;
  ticketType?: TicketTypeEditable;
  onUpdated?: (ticketType: TicketTypeEditable) => void;
};

function toLocalInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  const local = new Date(date.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 16);
}

export default function TicketTypeForm({ eventId, onCreated, ticketType, onUpdated }: Props) {
  const isEditing = Boolean(ticketType);

  const initial = useMemo<{
    name: string;
    description: string;
    price: string;
    currency: string;
    totalQuantity: number;
    perOrderLimit: number | '';
    status: 'DRAFT' | 'ON_SALE' | 'ARCHIVED';
    saleEndsAt: string;
  }>(
    () => ({
      name: ticketType?.name ?? '',
      description: ticketType?.description ?? '',
      price: ticketType ? (ticketType.priceCents / 100).toString() : '0',
      currency: ticketType?.currency ?? 'PEN',
      totalQuantity: ticketType?.totalQuantity ?? 0,
      perOrderLimit:
        ticketType?.perOrderLimit !== undefined && ticketType?.perOrderLimit !== null
          ? ticketType.perOrderLimit
          : '',
      status: ticketType?.status ?? 'ON_SALE',
      saleEndsAt: toLocalInput(ticketType?.saleEndsAt),
    }),
    [ticketType],
  );

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [price, setPrice] = useState(initial.price);
  const [currency, setCurrency] = useState(initial.currency);
  const [totalQuantity, setTotalQuantity] = useState(initial.totalQuantity);
  const [perOrderLimit, setPerOrderLimit] = useState<number | ''>(initial.perOrderLimit);
  const [status, setStatus] = useState<'DRAFT' | 'ON_SALE' | 'ARCHIVED'>(initial.status);
  const [saleEndsAt, setSaleEndsAt] = useState(initial.saleEndsAt);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(initial.name);
    setDescription(initial.description);
    setPrice(initial.price);
    setCurrency(initial.currency);
    setTotalQuantity(initial.totalQuantity);
    setPerOrderLimit(initial.perOrderLimit);
    setStatus(initial.status);
    setSaleEndsAt(initial.saleEndsAt);
    setError(null);
  }, [initial]);

  const reset = () => {
    setName('');
    setDescription('');
    setPrice('0');
    setCurrency('PEN');
    setTotalQuantity(0);
    setPerOrderLimit('');
    setStatus('ON_SALE');
    setSaleEndsAt('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Ingresa un nombre para el ticket');
      return;
    }
    if (totalQuantity <= 0) {
      setError('Define la cantidad disponible');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const priceNumber = Number.parseFloat(price || '0');
      const normalizedPrice = Number.isNaN(priceNumber) ? 0 : priceNumber;
      const payload = {
        name: name.trim(),
        description: description || undefined,
        price: normalizedPrice,
        currency,
        totalQuantity,
        perOrderLimit: perOrderLimit === '' ? undefined : perOrderLimit,
        saleEndsAt: saleEndsAt ? new Date(saleEndsAt).toISOString() : undefined,
        status,
      };
      const url = isEditing
        ? `/api/admin/tickets/ticket-types/${ticketType?.id}`
        : `/api/admin/tickets/events/${eventId}/ticket-types`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || (isEditing ? 'No se pudo actualizar el tipo de ticket' : 'No se pudo crear el tipo de ticket'));
      }
      const json = (await res.json()) as { ticketType?: TicketTypeEditable } | null;
      if (isEditing) {
        const updated = json?.ticketType;
        if (updated) {
          onUpdated?.(updated);
        } else {
          onUpdated?.({
            ...(ticketType as TicketTypeEditable),
            name: payload.name,
            description: payload.description ?? null,
            priceCents: Math.round(payload.price * 100),
            currency: payload.currency,
            totalQuantity: payload.totalQuantity,
            perOrderLimit: payload.perOrderLimit ?? null,
            saleEndsAt: payload.saleEndsAt ?? null,
            status: payload.status ?? (ticketType as TicketTypeEditable).status,
          });
        }
      } else {
        reset();
        onCreated?.();
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-100">
          {isEditing ? 'Editar tipo de ticket' : 'Nuevo tipo de ticket'}
        </h3>
        <span className="text-xs text-gray-400">
          {isEditing
            ? 'Actualiza la información y la ventana de venta.'
            : 'Define cupos y precio.'}
        </span>
      </div>

      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Nombre *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="General, VIP, Backstage…"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="Beneficios, acceso, consumo…"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Precio (S/.)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Moneda
          </label>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Cantidad disponible *
          </label>
          <input
            type="number"
            min={0}
            value={totalQuantity}
            onChange={(e) => {
              const value = Number.parseInt(e.target.value, 10);
              setTotalQuantity(Number.isNaN(value) ? 0 : value);
            }}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Límite por envío
          </label>
          <input
            type="number"
            min={1}
            value={perOrderLimit === '' ? '' : perOrderLimit}
            onChange={(e) => {
              const value = e.target.value;
              setPerOrderLimit(value === '' ? '' : Number.parseInt(value, 10));
            }}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="Opcional"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
          >
            <option value="ON_SALE">En venta</option>
            <option value="DRAFT">Borrador</option>
            <option value="ARCHIVED">Archivado</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Fin de venta
          </label>
          <input
            type="datetime-local"
            value={saleEndsAt}
            onChange={(e) => setSaleEndsAt(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {submitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear tipo'}
        </button>
      </div>
    </form>
  );
}
