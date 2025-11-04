'use client';

import { useEffect, useMemo, useState } from 'react';

type EventShape = {
  id: string;
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
  bannerKey?: string | null;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt?: string;
  updatedAt?: string;
  _count?: unknown;
};

export type EventDetailsFormEvent = EventShape;

type EventWithStatus = EventShape & { status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' };

type Props = {
  event: EventWithStatus;
  onCancel: () => void;
  onSaved: (event: EventWithStatus) => void;
};

type FormState = {
  title: string;
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  address: string;
  city: string;
  country: string;
  bannerUrl: string;
  bannerKey: string;
};

const emptyState: FormState = {
  title: '',
  summary: '',
  description: '',
  startsAt: '',
  endsAt: '',
  venue: '',
  address: '',
  city: '',
  country: '',
  bannerUrl: '',
  bannerKey: '',
};

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export default function EventDetailsForm({ event, onCancel, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(emptyState);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      title: event.title,
      summary: event.summary ?? '',
      description: event.description ?? '',
      startsAt: toDateTimeLocal(event.startsAt),
      endsAt: toDateTimeLocal(event.endsAt),
      venue: event.venue ?? '',
      address: event.address ?? '',
      city: event.city ?? '',
      country: event.country ?? '',
      bannerUrl: event.bannerUrl ?? '',
      bannerKey: event.bannerKey ?? '',
    });
  }, [event]);

  const hasBanner = useMemo(() => !!form.bannerUrl, [form.bannerUrl]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/tickets/uploads/banner', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'No se pudo subir la imagen');
      }
      const data = (await res.json()) as { url: string; key: string };
      setForm((prev) => ({ ...prev, bannerUrl: data.url, bannerKey: data.key }));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error desconocido al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          summary: optionalString(form.summary),
          description: optionalString(form.description),
          startsAt: toIso(form.startsAt),
          endsAt: toIso(form.endsAt),
          venue: optionalString(form.venue),
          address: optionalString(form.address),
          city: optionalString(form.city),
          country: optionalString(form.country),
          bannerUrl: form.bannerUrl || undefined,
          bannerKey: form.bannerKey || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'No se pudo guardar el evento');
      }
      const data = (await res.json()) as { event: EventShape };
      onSaved(data.event);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error desconocido al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-white/10 bg-black/30 p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Editar detalles del evento</h3>
          <p className="text-xs text-gray-400">Actualiza texto, fechas y banner.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-white/10 px-3 py-1 text-xs text-gray-200 hover:bg-white/10"
        >
          Cancelar
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Título*
          </label>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="Ej. Noche de Infiltragos"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Resumen
          </label>
          <input
            value={form.summary}
            onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="Subtítulo breve"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Descripción
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={4}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="Detalles del evento..."
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Inicio
          </label>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Fin
          </label>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Venue
          </label>
          <input
            value={form.venue}
            onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="Local o club"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Dirección
          </label>
          <input
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="Calle y número"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Ciudad
          </label>
          <input
            value={form.city}
            onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="Ciudad"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            País
          </label>
          <input
            value={form.country}
            onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            placeholder="País"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Banner (836px x 522px recomendado)
          </label>
          <div className="mt-2 flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 hover:bg-white/10">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              {uploading ? 'Subiendo…' : 'Subir imagen'}
            </label>
            {hasBanner && (
              <span className="text-xs text-emerald-200">Banner listo para usar.</span>
            )}
          </div>
          {hasBanner && (
            <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.bannerUrl} alt="Banner preview" className="h-32 w-full object-cover" />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
