"use client";
import React, { useMemo } from 'react';

type Contestant = { id: string; name: string; slug: string };
type Poll = {
  id: string;
  title: string;
  round: number;
  startAt: string;
  endAt: string;
  nextPollId?: string | null;
  nextSlot?: number | null;
  contestants: { id: string; contestantId: string }[];
};

export default function BracketView({
  polls,
  contestants,
  onAddToPoll,
  onRemoveFromPoll,
  onCreateContestant,
  onUpdateContestant,
}: {
  polls: Poll[];
  contestants: Contestant[];
  onAddToPoll: (pollId: string, ids: string[]) => Promise<void>;
  onRemoveFromPoll: (pollId: string, contestantId: string) => Promise<void>;
  onCreateContestant: (name: string, photoUrl?: string) => Promise<Contestant | null>;
  onUpdateContestant: (id: string, data: Partial<Contestant & { photoUrl?: string }>) => Promise<void>;
}) {
  const grouped = useMemo(() => {
    const map = new Map<number, Poll[]>();
    for (const p of polls) {
      const arr = map.get(p.round) || [];
      arr.push(p);
      map.set(p.round, arr);
    }
    const rounds = Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, ps]) => ({ round, polls: ps.sort((a, b) => a.title.localeCompare(b.title)) }));
    return rounds;
  }, [polls]);

  const pollTitleById = useMemo(() => Object.fromEntries(polls.map(p => [p.id, p.title])), [polls]);

  if (grouped.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Bracket</h2>
      <div className="overflow-x-auto">
        <div className="grid auto-cols-fr grid-flow-col gap-4 min-w-[700px]">
          {grouped.map(col => (
            <div key={col.round} className="space-y-3">
              <div className="text-sm font-medium text-gray-300">Ronda {col.round}</div>
              {col.polls.map(p => (
                <div key={p.id} className="rounded border border-white/10 bg-white/5 p-3 space-y-2">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-gray-400">{new Date(p.startAt).toLocaleString()} → {new Date(p.endAt).toLocaleString()}</div>
                  {p.round === 1 ? (
                    <RoundOneManager
                      poll={p}
                      allContestants={contestants}
                      onAddToPoll={ids => onAddToPoll(p.id, ids)}
                      onRemoveFromPoll={id => onRemoveFromPoll(p.id, id)}
                      onCreateContestant={onCreateContestant}
                      onUpdateContestant={onUpdateContestant}
                    />
                  ) : (
                    <div className="text-xs text-gray-300">
                      {p.contestants.length > 0 ? (
                        <span>{p.contestants.length} participantes</span>
                      ) : (
                        <span className="text-yellow-400">Sin participantes asignados</span>
                      )}
                    </div>
                  )}
                  {p.nextPollId && (
                    <div className="text-xs text-gray-300">
                      → Siguiente: {pollTitleById[p.nextPollId]} {p.nextSlot ? `(slot ${p.nextSlot})` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RoundOneManager({
  poll,
  allContestants,
  onAddToPoll,
  onRemoveFromPoll,
  onCreateContestant,
  onUpdateContestant,
}: {
  poll: Poll;
  allContestants: Contestant[];
  onAddToPoll: (ids: string[]) => Promise<void>;
  onRemoveFromPoll: (id: string) => Promise<void>;
  onCreateContestant: (name: string, photoUrl?: string) => Promise<Contestant | null>;
  onUpdateContestant: (id: string, data: Partial<Contestant & { photoUrl?: string }>) => Promise<void>;
}) {
  const now = Date.now();
  const editable = now < new Date(poll.startAt).getTime();
  const assigned = new Set(poll.contestants.map(pc => pc.contestantId));
  const available = allContestants.filter(c => !assigned.has(c.id));
  const [chosen, setChosen] = React.useState<string[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');

  if (!editable) {
    return (
      <div className="text-xs text-gray-300">Inscripción cerrada para este match</div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="text-xs text-gray-300">Participantes</div>
        <div className="flex flex-wrap gap-2">
          {Array.from(assigned).map(id => {
            const c = allContestants.find(x => x.id === id);
            if (!c) return null;
            const isEditing = editingId === id;
            return (
              <div key={id} className="inline-flex items-center gap-2 border border-white/10 rounded px-2 py-1 bg-white/5">
                {isEditing ? (
                  <>
                    <input
                      className="w-44 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-sm"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                    />
                    <button className="text-xs bg-white/10 px-2 py-1 rounded" onClick={async () => { await onUpdateContestant(id, { name: editName }); setEditingId(null); }}>
                      Guardar
                    </button>
                    <button className="text-xs bg-white/10 px-2 py-1 rounded" onClick={() => setEditingId(null)}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <span>{c.name}</span>
                    <button className="text-xs bg-white/10 px-2 py-1 rounded" onClick={() => { setEditingId(id); setEditName(c.name); }}>Editar</button>
                    <button className="text-xs bg-white/10 px-2 py-1 rounded" onClick={() => onRemoveFromPoll(id)}>Quitar</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          multiple
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 h-28"
          value={chosen}
          onChange={e => setChosen(Array.from(e.currentTarget.selectedOptions).map(o => o.value))}
        >
          {available.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium bg-white/10 text-foreground hover:bg-white/15" onClick={() => onAddToPoll(chosen)}>
          Agregar
        </button>
      </div>

      <QuickAdd onCreate={onCreateContestant} onAdded={c => setChosen(prev => [...prev, c.id])} />
    </div>
  );
}

function QuickAdd({ onCreate, onAdded }: { onCreate: (name: string, photoUrl?: string) => Promise<Contestant | null>; onAdded: (c: Contestant) => void }) {
  const [name, setName] = React.useState('');
  const [photoUrl, setPhotoUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-end">
      <div className="md:flex-1">
        <label className="block text-xs text-gray-300">Nuevo participante</label>
        <input className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 text-sm" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="md:flex-1">
        <label className="block text-xs text-gray-300">Foto (URL opcional)</label>
        <input className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 text-sm" placeholder="https://..." value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} />
      </div>
      <div>
        <button
          disabled={loading || !name.trim()}
          className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${loading ? 'bg-white/20 text-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
          onClick={async () => {
            setLoading(true);
            try {
              const c = await onCreate(name.trim(), photoUrl.trim() || undefined);
              if (c) { onAdded(c); setName(''); setPhotoUrl(''); }
            } finally { setLoading(false); }
          }}
        >
          {loading ? 'Agregando…' : 'Crear y seleccionar'}
        </button>
      </div>
    </div>
  );
}
