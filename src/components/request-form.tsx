'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import SongAutocomplete from '@/components/song-autocomplete';
import { TrackSuggestion } from '@/types/spotify';

const schema = z.object({
  song_title: z.string().min(1, 'La canción es obligatoria').max(100, 'Máx. 100 caracteres'),
  artist: z.string().min(1, 'El artista es obligatorio').max(100, 'Máx. 100 caracteres'),
  table_or_name: z.string().max(50, 'Máx. 50 caracteres').optional().or(z.literal('')),
  track_id: z.string().optional(),
  track_uri: z.string().optional(),
});

type FormDataShape = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
}

export default function RequestForm({ onSuccess }: Props) {
  const [values, setValues] = useState<FormDataShape>({
    song_title: '',
    artist: '',
    table_or_name: '',
  });
  const [state, setState] = useState<'idle' | 'submitting'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string>('');

  function onChange<K extends keyof FormDataShape>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  useEffect(() => {
    document.getElementById('song_title')?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError('');
    setErrors({});
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as string;
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setState('submitting');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        let message = 'Hubo un problema al enviar tu pedido. Intenta nuevamente.';
        if (res.status === 429) {
          const data = (await res.json().catch(() => null)) as {
            retry_after_seconds?: number;
          } | null;
          if (data && typeof data.retry_after_seconds === 'number') {
            message = `Solo puedes pedir una canción cada 2 minutos. Intenta de nuevo en ${data.retry_after_seconds} segundos.`;
          } else {
            message = 'Solo puedes pedir una canción cada 2 minutos. Intenta de nuevo más tarde.';
          }
        }
        setGlobalError(message);
        setState('idle');
        return;
      }
      setValues({ song_title: '', artist: '', table_or_name: '' });
      onSuccess();
    } catch {
      setGlobalError('Hubo un problema al enviar tu pedido. Intenta nuevamente.');
      setState('idle');
    }
  }

  const disabled = state === 'submitting';

  return (
    <div>
      <header className="mb-6 text-left md:text-center">
        <h1
          id="request-form-title"
          className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100"
        >
          Pide tu canción <span aria-hidden>🎵</span>
        </h1>
        <p className="mt-1 text-slate-400 text-sm">
          Escribe el título, el artista y (opcional) tu mesa o nombre.
        </p>
      </header>
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-700/60 bg-slate-900/60 backdrop-blur p-6 shadow-xl space-y-4"
      >
        {globalError && (
          <p
            role="alert"
            className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {globalError}
          </p>
        )}

        <div>
          <label htmlFor="song_title" className="block text-sm font-medium text-slate-200 mb-1">
            Canción
          </label>
          <SongAutocomplete
            value={values.song_title}
            onValueChange={(v) => onChange('song_title', v)}
            onArtistChange={(v) => onChange('artist', v)}
            onTrackSelect={(t: TrackSuggestion | null) =>
              setValues((prev) => ({ ...prev, track_id: t?.id, track_uri: t?.uri }))
            }
            disabled={disabled}
          />
          {errors.song_title && (
            <p className="mt-1 text-xs text-rose-300">{errors.song_title}</p>
          )}
        </div>

        <div>
          <label htmlFor="artist" className="block text-sm font-medium text-slate-200 mb-1">
            Artista
          </label>
          <input
            id="artist"
            name="artist"
            value={values.artist}
            onChange={(e) => onChange('artist', e.target.value)}
            placeholder="Ej. The Weeknd"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-400 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-600"
            required
            maxLength={100}
            disabled={disabled}
            autoComplete="off"
          />
          {errors.artist && <p className="mt-1 text-xs text-rose-300">{errors.artist}</p>}
        </div>

        <div>
          <label htmlFor="table_or_name" className="block text-sm font-medium text-slate-200 mb-1">
            Mesa o nombre <span className="text-slate-400">(opcional)</span>
          </label>
          <input
            id="table_or_name"
            name="table_or_name"
            value={values.table_or_name}
            onChange={(e) => onChange('table_or_name', e.target.value)}
            placeholder="Ej. Mesa 2 o Box 4"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-400 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-600"
            maxLength={50}
            disabled={disabled}
            autoComplete="off"
          />
          {errors.table_or_name && (
            <p className="mt-1 text-xs text-rose-300">{errors.table_or_name}</p>
          )}
        </div>

        <button
          className="w-full bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-white px-4 py-2.5 rounded-lg font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
          disabled={disabled}
          type="submit"
        >
          {state === 'submitting' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Enviando…
            </span>
          ) : (
            'Enviar'
          )}
        </button>

        <p className="text-xs text-slate-500 text-center">
          Al enviar aceptas que tu solicitud puede mostrarse en la pantalla del DJ.
        </p>
      </form>
    </div>
  );
}

