'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

const initialState: FormState = {
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
  status: 'DRAFT',
};

function toIso(datetime: string) {
  if (!datetime) return undefined;
  const date = new Date(datetime);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export default function NewTicketEventPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title) {
      setError('Ingresa un título para el evento');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tickets/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          summary: form.summary || undefined,
          description: form.description || undefined,
          startsAt: toIso(form.startsAt),
          endsAt: toIso(form.endsAt),
          venue: form.venue || undefined,
          address: form.address || undefined,
          city: form.city || undefined,
          country: form.country || undefined,
          bannerUrl: form.bannerUrl || undefined,
          bannerKey: form.bannerKey || undefined,
          status: form.status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'No se pudo crear el evento');
      }
      const data = (await res.json()) as { event: { id: string } };
      router.push(`/tickets/${data.event.id}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Nuevo evento</h2>
          <p className="text-sm text-gray-300">Define la información base y el banner para compartir.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-white/10 bg-black/30 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200">Nombre del evento *</label>
              <input
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                placeholder="Nombre llamativo del evento"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200">Resumen</label>
              <input
                value={form.summary}
                onChange={(e) => handleChange('summary', e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                placeholder="Un subtítulo breve"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={6}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                placeholder="Detalles, artistas invitados, información relevante…"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-200">Inicio</label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => handleChange('startsAt', e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">Fin</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => handleChange('endsAt', e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200">Venue</label>
              <input
                value={form.venue}
                onChange={(e) => handleChange('venue', e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                placeholder="Local o club"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200">Dirección</label>
              <input
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                placeholder="Calle y número"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200">Ciudad</label>
                <input
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                  placeholder="Ej. Lima"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">País</label>
                <input
                  value={form.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                  placeholder="Ej. Perú"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200">
                Banner (836px x 522px recomendado)
              </label>
              <div className="mt-2 flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100 hover:bg-white/10">
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
                {form.bannerUrl && (
                  <span className="text-xs text-emerald-300">Imagen cargada correctamente</span>
                )}
              </div>
              {form.bannerUrl && (
                <div className="mt-3 overflow-hidden rounded-lg border border-white/5 bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.bannerUrl} alt="Banner preview" className="h-40 w-full object-cover" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200">Estado</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value as FormState['status'])}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
              >
                <option value="DRAFT">Borrador</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="ARCHIVED">Archivado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {submitting ? 'Guardando…' : 'Crear evento'}
          </button>
        </div>
      </form>
    </section>
  );
}
