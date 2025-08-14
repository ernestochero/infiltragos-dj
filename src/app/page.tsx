'use client';
import { useState } from 'react';
import { z } from 'zod';

const schema = z.object({
  song_title: z.string().min(1),
  artist: z.string().min(1),
  table_or_name: z.string().optional(),
});

export default function RequestForm() {
  const [state, setState] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [errors, setErrors] = useState<string>('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors('');
    const formData = new FormData(e.currentTarget);
    const data = {
      song_title: formData.get('song_title') as string,
      artist: formData.get('artist') as string,
      table_or_name: formData.get('table_or_name') as string,
    };
    const parse = schema.safeParse(data);
    if (!parse.success) {
      setErrors('Datos inválidos');
      return;
    }
    setState('submitting');
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parse.data),
      });
      setState('success');
      window.location.href = '/queue';
    } catch {
      setErrors('Error al enviar');
      setState('idle');
    }
  }

  return (
    <main className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Pide tu canción 🎵</h1>
      {errors && <p className="text-red-500">{errors}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label>
          <span className="block">Canción</span>
          <input name="song_title" className="w-full text-black" required />
        </label>
        <label>
          <span className="block">Artista</span>
          <input name="artist" className="w-full text-black" required />
        </label>
        <label>
          <span className="block">Mesa o nombre</span>
          <input name="table_or_name" className="w-full text-black" />
        </label>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={state === 'submitting'}
        >Enviar</button>
      </form>
    </main>
  );
}
