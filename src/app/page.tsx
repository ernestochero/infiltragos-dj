'use client';
import { useState } from 'react';
import { z } from 'zod';

const schema = z.object({
  song_title: z.string().min(1, 'La canción es obligatoria').max(100, 'Máx. 100 caracteres'),
  artist: z.string().min(1, 'El artista es obligatorio').max(100, 'Máx. 100 caracteres'),
  table_or_name: z.string().max(50, 'Máx. 50 caracteres').optional().or(z.literal('')),
});

type FormDataShape = z.infer<typeof schema>;

export default function RequestForm() {
  const [values, setValues] = useState<FormDataShape>({
    song_title: '',
    artist: '',
    table_or_name: '',
  });
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string>('');

  function onChange<K extends keyof FormDataShape>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
    // limpiar error del campo al teclear
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

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
      setState('error');
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
        throw new Error('bad status');
      }
      setState('success');
      // opcional: limpiar y redirigir con un pequeño delay para ver el mensaje
      setTimeout(() => {
        window.location.href = '/queue';
      }, 600);
    } catch {
      setGlobalError('Hubo un problema al enviar tu pedido. Intenta nuevamente.');
      setState('idle');
    }
  }

  const disabled = state === 'submitting';

  return (
    <main className="min-h-screen grid place-items-start md:place-items-center px-4 py-8">
      <div className="w-full max-w-lg">
        <header className="mb-6 text-left md:text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100">
            Pide tu canción <span aria-hidden>🎵</span>
          </h1>
          <p className="mt-1 text-slate-400 text-sm">
            Escribe el título, el artista y (opcional) tu mesa o nombre.
          </p>
        </header>

        {state === 'success' ? (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-300">
            ¡Listo! Tu pedido fue enviado. Redirigiendo a la cola…
          </div>
        ) : (
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
              <input
                id="song_title"
                name="song_title"
                value={values.song_title}
                onChange={(e) => onChange('song_title', e.target.value)}
                placeholder="Ej. Blinding Lights"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-400 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-600"
                required
                maxLength={100}
                disabled={disabled}
                autoComplete="off"
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
              <label
                htmlFor="table_or_name"
                className="block text-sm font-medium text-slate-200 mb-1"
              >
                Mesa o nombre <span className="text-slate-400">(opcional)</span>
              </label>
              <input
                id="table_or_name"
                name="table_or_name"
                value={values.table_or_name}
                onChange={(e) => onChange('table_or_name', e.target.value)}
                placeholder="Ej. Mesa 12"
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
              {state === 'submitting' ? 'Enviando…' : 'Enviar'}
            </button>

            <p className="text-xs text-slate-500 text-center">
              Al enviar aceptas que tu solicitud puede mostrarse en la pantalla del DJ.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
