'use client';

import useSWR from 'swr';

type Item = Record<string, unknown>;

const fetcher = (url: string) => fetch(url).then(r => r.json());

function fmt(val: unknown): string {
  if (Array.isArray(val)) return val.map(v => String(v)).join(', ');
  if (val == null) return '';
  return String(val);
}

export default function ParticipantsList({
  raffleId,
  columns,
}: {
  raffleId: string;
  columns: { id: string; label: string }[];
}) {
  const { data, isLoading } = useSWR<{ items: Item[]; total: number }>(
    `/api/raffles/${raffleId}/participants`,
    fetcher,
    { refreshInterval: 8000 },
  );

  const items = data?.items ?? [];

  const primaryCol = columns[0]?.id;
  const secondaryCols = columns.slice(1);

  return (
    <section aria-labelledby="participants-list" className="mt-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2
          id="participants-list"
          className="text-xl font-extrabold text-slate-100 tracking-wide uppercase"
        >
          Participantes
        </h2>
        <span className="text-xs text-slate-500">{data?.total ?? 0} total</span>
      </div>

      {isLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="animate-pulse rounded border border-slate-200 bg-white p-3">
              <div className="h-4 w-40 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-500">
          Aún no hay participantes.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => {
            const primary = primaryCol ? fmt(it[primaryCol]) : '';
            const meta = secondaryCols
              .map(c => fmt(it[c.id]))
              .filter(Boolean)
              .join(' • ');
            return (
              <li
                key={idx}
                className="rounded border border-slate-200 bg-white p-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{primary || `Participante #${idx + 1}`}</p>
                    {meta && <p className="text-xs text-slate-600 mt-0.5 truncate">{meta}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
