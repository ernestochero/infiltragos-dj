"use client";
import useSWR from 'swr';
import { useMemo, useState } from 'react';

type Item = {
  pollContestantId: string;
  contestantId: string;
  name: string;
  slug: string;
  photoUrl?: string | null;
  tally: number;
};

type PollView = {
  id: string;
  contestId: string;
  title: string;
  round: number;
  startAt: string;
  endAt: string;
  status: 'upcoming' | 'active' | 'finished';
  timeRemaining: number;
  hasVoted: boolean;
  items: Item[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PublicPollPage({ params }: { params: { id: string; contestId: string } }) {
  const { data, mutate } = useSWR<PollView>(`/api/polls/${params.id}`, fetcher, {
    refreshInterval: 2000,
  });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  // Ensure a stable fingerprint cookie exists
  useState(() => {
    if (typeof document !== 'undefined') {
      const has = document.cookie.includes('vfp=');
      if (!has) {
        const hasCrypto = typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto;
        const val = hasCrypto ? (globalThis.crypto as Crypto).randomUUID() : Math.random().toString(36).slice(2) + Date.now();
        const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toUTCString();
        document.cookie = `vfp=${val}; Path=/; Expires=${expires}; SameSite=Lax`;
      }
    }
    return null;
  });

  const total = useMemo(() => (data ? data.items.reduce((acc, it) => acc + it.tally, 0) : 0), [data]);
  const timeLeft = useMemo(() => {
    if (!data) return '';
    const ms = data.timeRemaining;
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${h}h ${m}m ${ss}s`;
  }, [data]);

  async function vote(contestantId: string) {
    setLoadingId(contestantId);
    try {
      const res = await fetch(`/api/polls/${params.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contestantId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'No se pudo registrar tu voto');
      } else {
        await mutate();
      }
    } finally {
      setLoadingId(null);
    }
  }

  if (!data) return <div className="p-4">Cargando…</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{data.title}</h1>
        <div className="text-sm text-gray-600">
          {data.status === 'upcoming' && <span>Empieza pronto</span>}
          {data.status === 'active' && <span>Quedan {timeLeft}</span>}
          {data.status === 'finished' && <span>Votación finalizada</span>}
        </div>
      </header>

      <ul className="space-y-3">
        {data.items.map((it) => {
          const pct = total > 0 ? Math.round((it.tally * 100) / total) : 0;
          const disabled = data.status !== 'active' || data.hasVoted || loadingId === it.contestantId;
          return (
            <li key={it.contestantId} className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{it.name}</div>
                <div className="text-sm text-gray-600">{it.tally} votos ({pct}%)</div>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded">
                <div className="bg-blue-500 h-2 rounded" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3">
                <button
                  className={`px-3 py-1 rounded text-white ${disabled ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                  disabled={disabled}
                  onClick={() => vote(it.contestantId)}
                >
                  {data.hasVoted ? '¡Gracias por votar!' : loadingId === it.contestantId ? 'Enviando…' : 'Votar'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
