'use client';
import useSWR from 'swr';
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Modal from '@/components/modal';

const RequestForm = dynamic(() => import('@/components/request-form'), {
  loading: () => <p className="text-slate-100 text-center">Cargando formulario…</p>,
  ssr: false,
});

type RequestStatus = 'PENDING' | 'PLAYING' | 'DONE' | 'REJECTED';

interface Request {
  id: string;
  songTitle: string;
  artist: string;
  votes: number;
  status: RequestStatus;
  tableOrName?: string;
  createdAt?: string;
  // updatedAt?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function QueuePage() {
  // Fetch all, we will filter client-side. If you add server filtering, change the URL to /api/requests?status=all
  const { data, isLoading, mutate } = useSWR<Request[]>('/api/requests', fetcher, {
    refreshInterval: 8000,
  });

  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);

  function handleSuccess() {
    setOpen(false);
    setToast(true);
    mutate();
    setTimeout(() => setToast(false), 3000);
  }

  const { nowPlaying, pending } = useMemo(() => {
    const list = data ?? [];

    // Determine currently playing: pick the most recently updated or first PLAYING
    const playing = list
      .filter((r) => r.status === 'PLAYING')
      // If you have updatedAt, prefer the latest:
      // .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
      [0];

    // Only PENDING for the visible queue. Sort by creation date asc (oldest first)
    const pendingSorted = list
      .filter((r) => r.status === 'PENDING')
      .slice()
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));

    return { nowPlaying: playing, pending: pendingSorted };
  }, [data]);

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Cola De Canciones</h1>
        <p className="text-sm text-slate-500">Solicitudes actualmente pendientes y qué se está reproduciendo ahora.</p>
      </header>
      <div className="mb-6 flex justify-center">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 transition"
        >
          🎵 Pedir una Canción
        </button>
      </div>

      {/* Now Playing */}
      <section aria-labelledby="now-playing" className="mb-6">
        <h2 id="now-playing" className="sr-only">Now Playing</h2>
        {isLoading ? (
          <div className="animate-pulse rounded-lg border border-amber-300 bg-amber-50 p-4">
            <div className="h-4 w-40 bg-amber-200 rounded mb-2" />
            <div className="h-3 w-64 bg-amber-200 rounded" />
          </div>
        ) : nowPlaying ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-amber-900 font-semibold">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                Reproduciendo
              </span>
              <span className="text-xs text-amber-900/70 font-medium">
                👍 {nowPlaying.votes} votos
              </span>
            </div>
            <p className="mt-2 text-lg md:text-xl font-bold text-amber-900">
              {nowPlaying.songTitle}{' '}
              <span className="font-medium text-amber-800">— {nowPlaying.artist}</span>
            </p>
            {nowPlaying.tableOrName && (
              <p className="text-xs mt-1 text-amber-900/70">From: {nowPlaying.tableOrName}</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-500">
            Nothing is playing right now.
          </div>
        )}
      </section>

      {/* Pending Queue */}
      <section aria-labelledby="pending-queue">
        <div className="flex items-baseline justify-between mb-3">
          <h2
            id="pending-queue"
            className="text-xl font-extrabold text-slate-100 tracking-wide uppercase"
          >
            Solicitudes Pendientes
          </h2>
          <span className="text-xs text-slate-500">{pending?.length ?? 0} items</span>
        </div>

        {isLoading ? (
          <ul className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li
                key={i}
                className="animate-pulse rounded border border-slate-200 bg-white p-3"
              >
                <div className="h-4 w-56 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-200 rounded" />
              </li>
            ))}
          </ul>
        ) : pending && pending.length > 0 ? (
            <ul className="space-y-2">
              {pending.map((r: Request) => (
                <li
                  key={r.id}
                  className="rounded border border-slate-200 bg-white p-3 hover:bg-slate-50 transition"
                >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {r.songTitle}{' '}
                      <span className="font-normal text-slate-700">— {r.artist}</span>
                    </p>
                    {r.tableOrName && (
                      <p className="text-xs text-slate-500 mt-0.5">From: {r.tableOrName}</p>
                    )}
                  </div>
                  <span className="whitespace-nowrap text-xs font-medium text-slate-600">
                    👍 {r.votes} votos
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-500">
            Sin Solicitudes Pendientes.
          </div>
        )}
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        titleId="request-form-title"
      >
        <RequestForm onSuccess={handleSuccess} />
      </Modal>
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-md bg-emerald-600 text-white px-4 py-2 shadow-lg text-sm">
          Solicitud enviada
        </div>
      )}
    </main>
  );
}
