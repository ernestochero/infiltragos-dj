'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { TicketEventStatus } from '@prisma/client';
import TicketTypeForm from '@ticket/components/TicketTypeForm';
import IssueTicketForm from '@ticket/components/IssueTicketForm';
import EventDetailsForm, { EventDetailsFormEvent } from '@ticket/components/EventDetailsForm';
import Modal from '@/modules/Modal';

type TicketStatus = 'CREATED' | 'SENT' | 'REDEEMED' | 'CANCELLED';

type TicketTypeItem = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  totalQuantity: number;
  status: 'DRAFT' | 'ON_SALE' | 'ARCHIVED';
  saleEndsAt?: string | null;
  _count: {
    tickets: number;
    issues: number;
  };
  stats: {
    total: number;
    redeemed: number;
    sent: number;
    created: number;
    cancelled: number;
  };
};

type IssueItem = {
  id: string;
  purchaserName: string;
  purchaserEmail: string;
  purchaserPhone?: string | null;
  quantity: number;
  status: 'PENDING' | 'SENT' | 'CANCELLED';
  sentAt?: string | null;
  createdAt: string;
  note?: string | null;
  tickets: {
    id: string;
    code: string;
    status: TicketStatus;
    sequence?: number | null;
    sentAt?: string | null;
    validatedAt?: string | null;
  }[];
};

type EventDetailResponse = {
  event: {
    id: string;
    slug?: string | null;
    title: string;
    summary?: string | null;
    description?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    venue?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    bannerUrl?: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    createdAt: string;
    updatedAt: string;
  _count: {
    ticketTypes: number;
    tickets: number;
    issues: number;
  };
  bannerKey?: string | null;
  };
  ticketTypes: TicketTypeItem[];
  issues: IssueItem[];
  summary: {
    total: number;
    byStatus: Record<TicketStatus, number>;
  };
};

const statusBadges: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-200 border-gray-400/50',
  PUBLISHED: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  ARCHIVED: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
  ON_SALE: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40',
};

const statusLabels: Record<TicketEventStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
};


function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatCurrency(cents: number, currency: string) {
  return Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export default function TicketEventDetailPage({ params }: { params: { eventId: string } }) {
  const [data, setData] = useState<EventDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  
  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/events/${params.eventId}`, { cache: 'no-store' });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || 'No se pudo cargar el evento');
      }
      const json = (await res.json()) as EventDetailResponse;
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.eventId]);

  const totals = useMemo(() => {
    if (!data) return null;
    return {
      total: data.summary.total,
      redeemed: data.summary.byStatus?.REDEEMED ?? 0,
      pending:
        (data.summary.byStatus?.CREATED ?? 0) +
        (data.summary.byStatus?.SENT ?? 0),
      cancelled: data.summary.byStatus?.CANCELLED ?? 0,
    };
  }, [data]);

  const updateStatus = async (next: TicketEventStatus) => {
    setStatusUpdating(true);
    setStatusMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/events/${params.eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || 'No se pudo actualizar el estado del evento');
      }
      const json = (await res.json()) as { event: EventDetailResponse['event'] };
      setData((prev) => (prev ? { ...prev, event: json.event } : prev));
      setStatusMessage(`Estado actualizado a “${statusLabels[next]}”.`);
      // refrescamos datos para evitar caché y mostrar nuevos conteos
      await refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error inesperado al actualizar el estado');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handlePublish = () => {
    if (!data) return;
    void updateStatus('PUBLISHED');
  };

  const handleArchive = () => {
    if (!data) return;
    void updateStatus('ARCHIVED');
  };

  const handleDetailsSaved = (updated: EventDetailsFormEvent) => {
    setEditingDetails(false);
    setData((prev) =>
      prev
        ? {
            ...prev,
            event: {
              ...prev.event,
              ...updated,
              _count: prev.event._count,
            },
          }
        : prev,
    );
    setStatusMessage('Detalles del evento actualizados correctamente.');
    void refresh();
  };

  const handleCopyEventUrl = async (event: EventDetailResponse['event']) => {
    const slugOrId = event.slug || event.id;
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl.replace(/\/$/, '')}/events/${slugOrId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage('URL del evento copiada al portapapeles');
    } catch (err) {
      console.error('copy url error', err);
      setCopyMessage('No se pudo copiar la URL (revisa la consola)');
    } finally {
      setTimeout(() => setCopyMessage(null), 3000);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/tickets" className="text-xs text-blue-300 hover:text-blue-200">
              ← Volver
            </Link>
            {data && (
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    statusBadges[data.event.status] || 'bg-white/10 text-gray-200 border-white/20'
                  }`}
                >
                  {statusLabels[data.event.status]}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingDetails((prev) => !prev)}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-100 hover:bg-white/10"
                >
                  {editingDetails ? 'Cerrar edición' : 'Editar detalles'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyEventUrl(data.event)}
                  className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20"
                >
                  Copiar URL público
                </button>
                <Link
                  href={`/tickets/scanner?eventId=${data.event.id}`}
                  className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20"
                >
                  Escanear tickets
                </Link>
                {data.event.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={statusUpdating}
                    className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    Publicar
                  </button>
                )}
                {data.event.status !== 'ARCHIVED' && (
                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={statusUpdating}
                    className="rounded-md border border-slate-400/40 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-500/20 disabled:opacity-60"
                  >
                    Archivar
                  </button>
                )}
              </div>
            )}
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gray-100">
            {data?.event.title ?? 'Cargando…'}
          </h2>
          {data?.event.summary && <p className="text-sm text-gray-300">{data.event.summary}</p>}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {statusMessage && !error && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {statusMessage}
        </div>
      )}
      {copyMessage && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {copyMessage}
        </div>
      )}

      {loading && <p className="text-sm text-gray-300">Cargando detalle del evento…</p>}

      {editingDetails && data && (
        <EventDetailsForm
          event={data.event}
          onCancel={() => setEditingDetails(false)}
          onSaved={handleDetailsSaved}
        />
      )}

      {data && (
        <>
          <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
            {data.event.bannerUrl && (
                <div className="overflow-hidden rounded-lg border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.event.bannerUrl} alt={data.event.title} className="h-52 w-full object-cover" />
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-400">Inicio</h4>
                  <p className="text-sm text-gray-100">{formatDateTime(data.event.startsAt)}</p>
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-400">Fin</h4>
                  <p className="text-sm text-gray-100">{formatDateTime(data.event.endsAt)}</p>
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-400">Venue</h4>
                  <p className="text-sm text-gray-100">{data.event.venue || '—'}</p>
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-400">Dirección</h4>
                  <p className="text-sm text-gray-100">
                    {data.event.address || '—'}
                    {data.event.city ? ` · ${data.event.city}` : ''}
                  </p>
                </div>
              </div>
              {data.event.description && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-400">Descripción</h4>
                  <p className="whitespace-pre-line text-sm text-gray-200">{data.event.description}</p>
                </div>
              )}
            <div className="grid gap-3 sm:grid-cols-4">
              <SummaryCard title="Emitidos" value={totals?.total ?? 0} tone="default" />
              <SummaryCard title="Validados" value={totals?.redeemed ?? 0} tone="success" />
              <SummaryCard title="Pendientes" value={totals?.pending ?? 0} tone="warning" />
              <SummaryCard title="Cancelados" value={totals?.cancelled ?? 0} tone="danger" />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-100 hover:bg-white/10"
              >
                Actualizar datos
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Tipos de ticket</h3>
                <span className="text-xs text-gray-400">{data.ticketTypes.length} configurados</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(true)}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-100 hover:bg-white/10"
                >
                  Nuevo tipo
                </button>
                <button
                  type="button"
                  onClick={() => setShowIssueModal(true)}
                  className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-500/20"
                >
                  Enviar tickets
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {data.ticketTypes.length === 0 && (
                <div className="rounded-md border border-white/10 bg-black/20 px-3 py-4 text-sm text-gray-300">
                  Aún no hay tipos de ticket. Crea uno para controlar cupos y precios.
                </div>
              )}
              {data.ticketTypes.map((type) => (
                  <div
                    key={type.id}
                    className="rounded-lg border border-white/10 bg-black/20 p-4 transition hover:border-indigo-500/50"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-gray-100">{type.name}</h4>
                        {type.description && (
                          <p className="text-sm text-gray-300">{type.description}</p>
                        )}
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadges[type.status] || 'border-white/10 bg-white/10 text-gray-100'}`}
                      >
                        {type.status === 'ON_SALE'
                          ? 'En venta'
                          : type.status === 'DRAFT'
                          ? 'Borrador'
                          : 'Archivado'}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Precio</p>
                        <p className="text-sm text-gray-100">
                          {formatCurrency(type.priceCents, type.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Disponibles</p>
                        <p className="text-sm text-gray-100">
                          {Math.max(type.totalQuantity - (type.stats.total - type.stats.cancelled), 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Vendidos</p>
                        <p className="text-sm text-gray-100">{type.stats.redeemed}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      <StatPill label="Emitidos" value={type.stats.total} tone="default" />
                      <StatPill label="Validados" value={type.stats.redeemed} tone="success" />
                      <StatPill
                        label="Pendientes"
                        value={type.stats.created + type.stats.sent}
                        tone="warning"
                      />
                      <StatPill label="Cancelados" value={type.stats.cancelled} tone="danger" />
                    </div>
                  </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">Emisiones recientes</h3>
              <span className="text-xs text-gray-400">
                Mostrando {data.issues.length} últimos envíos
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="hidden w-full md:block">
                <table className="min-w-full divide-y divide-white/10 text-sm text-gray-200">
                  <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Tickets</th>
                      <th className="px-4 py-3">Estados</th>
                      <th className="px-4 py-3">Enviado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 bg-black/30">
                    {data.issues.map((issue) => {
                      const validated = issue.tickets.filter((t) => t.status === 'REDEEMED').length;
                      return (
                        <tr key={issue.id} className="hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-100">{issue.purchaserName}</span>
                              <span className="text-xs text-gray-400">{issue.purchaserEmail}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-100">{issue.quantity}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge tone="success">{validated} validados</Badge>
                              <Badge tone="warning">
                                {issue.tickets.length - validated} pendientes
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-300">
                            {formatDateTime(issue.sentAt ?? issue.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden">
                <ul className="divide-y divide-white/10">
                  {data.issues.map((issue) => {
                    const validated = issue.tickets.filter((t) => t.status === 'REDEEMED').length;
                    return (
                      <li key={issue.id} className="space-y-2 bg-black/30 p-4">
                        <div>
                          <p className="font-semibold text-gray-100">{issue.purchaserName}</p>
                          <p className="text-xs text-gray-400">{issue.purchaserEmail}</p>
                        </div>
                        <p className="text-sm text-gray-200">
                          Tickets: <strong>{issue.quantity}</strong>
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge tone="success">{validated} validados</Badge>
                          <Badge tone="warning">
                            {issue.tickets.length - validated} pendientes
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400">
                          {formatDateTime(issue.sentAt ?? issue.createdAt)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      <Modal open={showTypeModal && !!data} onClose={() => setShowTypeModal(false)}>
        {data && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-100">Nuevo tipo de ticket</h3>
            <TicketTypeForm
              eventId={data.event.id}
              onCreated={() => {
                setShowTypeModal(false);
                void refresh();
              }}
            />
          </div>
        )}
      </Modal>

      <Modal open={showIssueModal && !!data} onClose={() => setShowIssueModal(false)}>
        {data && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-100">Enviar tickets</h3>
            <IssueTicketForm
              eventId={data.event.id}
              ticketTypes={data.ticketTypes.map((type) => ({
                id: type.id,
                name: type.name,
                totalQuantity: type.totalQuantity,
                stats: {
                  emitted: type.stats.total,
                  redeemed: type.stats.redeemed,
                  cancelled: type.stats.cancelled,
                },
              }))}
              onIssued={() => {
                setShowIssueModal(false);
                void refresh();
              }}
            />
          </div>
        )}
      </Modal>
    </section>
  );
}

type Tone = 'success' | 'warning' | 'danger' | 'default';

function Badge({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  const base = 'inline-flex items-center rounded-full border px-2 py-0.5';
  const tones: Record<Tone, string> = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
    danger: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
    default: 'border-white/10 bg-white/10 text-gray-100',
  };
  return <span className={`${base} ${tones[tone]}`}>{children}</span>;
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: Tone;
}) {
  const tones: Record<Tone, string> = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    danger: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
    default: 'border-white/10 bg-white/10 text-gray-100',
  };
  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${tones[tone]}`}>
      <p className="uppercase tracking-wide text-[11px] text-gray-400">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}

function SummaryCard({ title, value, tone }: { title: string; value: number; tone: Tone }) {
  const tones: Record<Tone, string> = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
    danger: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
    default: 'border-white/10 bg-white/5 text-gray-100',
  };
  return (
    <div className={`rounded-lg border px-3 py-3 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wide text-gray-300">{title}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
