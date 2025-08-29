'use client';

import useSWR from 'swr';
import { useEffect, useRef, useState } from 'react';

type Winner = { id: string; position: number; publicPreview: Record<string, unknown> };

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function WinnersLive({ raffleId, columns }: { raffleId: string; columns: { id: string; label: string }[]; }) {
  const { data } = useSWR<{ items: Winner[] }>(`/api/raffles/${raffleId}/winners`, fetcher, { refreshInterval: 2000 });
  const [displayed, setDisplayed] = useState<Winner[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const prevCount = useRef(0);
  const storageKey = `raffle:winners:seen:${raffleId}`;

  function launchConfetti() {
    if (typeof window === 'undefined') return;
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'fixed',
      inset: '0px',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: '9999',
    } as CSSStyleDeclaration);
    const style = document.createElement('style');
    style.textContent = `
      @keyframes confetti-fall { from { transform: translateY(-10vh) rotate(0); opacity: .9; } to { transform: translateY(105vh) rotate(720deg); opacity: 1; } }
    `;
    container.appendChild(style);
    const colors = ['#16a34a','#22c55e','#86efac','#059669','#10b981','#34d399','#06b6d4'];
    const count = 120;
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div');
      const size = 6 + Math.random() * 6;
      Object.assign(d.style, {
        position: 'absolute',
        top: '-10px',
        left: `${Math.random() * 100}%`,
        width: `${size}px`,
        height: `${size * 1.6}px`,
        backgroundColor: colors[i % colors.length],
        opacity: '0.9',
        borderRadius: '1px',
        transform: `rotate(${Math.random() * 360}deg)`,
        animation: `confetti-fall ${1200 + Math.random() * 1200}ms ease-out forwards`,
      } as CSSStyleDeclaration);
      container.appendChild(d);
    }
    document.body.appendChild(container);
    setTimeout(() => {
      try { document.body.removeChild(container); } catch {}
    }, 2500);
  }

  useEffect(() => {
    if (!data) return; // wait until first real response to avoid resetting stored counter on mount
    const items = data.items ?? [];
    const stored = typeof window !== 'undefined' ? Number(localStorage.getItem(storageKey) || '0') : 0;

    // If there are no winners, reset UI
    if (items.length === 0) {
      setDisplayed([]);
      prevCount.current = 0;
      if (typeof window !== 'undefined') localStorage.setItem(storageKey, '0');
      return;
    }

    // Animate only when there are NEW winners beyond what this device has already seen
    if (items.length > Math.max(prevCount.current, stored)) {
      setCountdown(3);
      const t = setInterval(() => {
        setCountdown(c => {
          if (c === null) return null;
          if (c <= 1) {
            clearInterval(t);
            setDisplayed(items);
            prevCount.current = items.length;
            launchConfetti();
            if (typeof window !== 'undefined') localStorage.setItem(storageKey, String(items.length));
            return null;
          }
          return c - 1;
        });
      }, 800);
      return () => clearInterval(t);
    }

    // No new winners → just sync without animation
    prevCount.current = items.length;
    setDisplayed(items);
    setCountdown(null);
    if (typeof window !== 'undefined') localStorage.setItem(storageKey, String(items.length));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <section aria-labelledby="winners-live" className="mt-10">
      <h2 id="winners-live" className="text-xl font-extrabold text-slate-100 tracking-wide uppercase mb-3">
        Ganadores
      </h2>
      {countdown !== null && (
        <div className="mb-4 text-center">
          <span className="inline-flex items-center rounded-full bg-amber-600 text-white px-3 py-2 text-sm font-semibold shadow">
            Cargando ganadores en {countdown}
          </span>
        </div>
      )}
      {displayed.length === 0 ? (
        <p className="text-sm text-slate-400">Aún no hay ganadores.</p>
      ) : (
        <ol className="space-y-3">
          {displayed.map(w => (
            <li key={w.id} className="animate-[fade-in_0.5s_ease-out] rounded border border-emerald-300/40 bg-emerald-50 p-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
                  {w.position}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-emerald-900">
                    {columns.map(c => String(w.publicPreview[c.id] ?? '')).filter(Boolean).join(' — ')}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </section>
  );
}
