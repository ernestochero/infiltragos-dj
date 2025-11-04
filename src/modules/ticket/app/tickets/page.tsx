'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type EventListItem = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  bannerUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    ticketTypes: number;
    tickets: number;
    issues: number;
  };
  stats: {
    totalTickets: number;
    redeemed: number;
    sent: number;
    created: number;
    cancelled: number;
  };
};

const statusLabels: Record<EventListItem['status'], string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function TicketsIndexPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/tickets/events', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('No se pudo cargar los eventos');
        }
        const data = (await res.json()) as { items: EventListItem[] };
        if (mounted) setEvents(data.items);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchEvents();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((event) => event.title.toLowerCase().includes(q));
  }, [events, search]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Eventos</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título…"
            className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
          />
          <Link
            href="/tickets/new"
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Nuevo evento
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-300">Cargando eventos…</p>}
      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {!loading && filteredEvents.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-6 text-center text-sm text-gray-300">
          No hay eventos aún. Crea el primero para comenzar.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.map((event) => (
          <Link
            href={`/tickets/${event.id}`}
            key={event.id}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/30 transition hover:border-indigo-500/70 hover:shadow-lg hover:shadow-indigo-500/10"
          >
            {event.bannerUrl && (
              <div className="relative h-40 w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.bannerUrl}
                  alt={event.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
            )}
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span
                  className="rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-xs font-semibold uppercase text-gray-100"
                >
                  {statusLabels[event.status]}
                </span>
                <span className="text-xs text-gray-400">{formatDate(event.startsAt)}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-100 group-hover:text-white">
                {event.title}
              </h3>
              {event.summary && <p className="line-clamp-2 text-sm text-gray-300">{event.summary}</p>}
              <div className="grid grid-cols-2 gap-2 rounded-md bg-white/5 p-3 text-xs text-gray-200">
                <div>
                  <span className="block text-[11px] uppercase tracking-wide text-gray-400">
                    Tipos de ticket
                  </span>
                  <span className="text-sm font-semibold">{event._count.ticketTypes}</span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wide text-gray-400">
                    Tickets emitidos
                  </span>
                  <span className="text-sm font-semibold">{event.stats.totalTickets}</span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wide text-gray-400">
                    Validados
                  </span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {event.stats.redeemed}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wide text-gray-400">
                    Por validar
                  </span>
                  <span className="text-sm font-semibold text-amber-300">
                    {Math.max(event.stats.totalTickets - event.stats.redeemed, 0)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
