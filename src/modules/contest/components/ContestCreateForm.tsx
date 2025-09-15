"use client";
import { useState } from 'react';

export default function ContestCreateForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contestantsText, setContestantsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [bracketMode, setBracketMode] = useState(false);
  const [participantsCount, setParticipantsCount] = useState<number>(8);
  const [matchSize, setMatchSize] = useState<number>(2);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const contestants = bracketMode
        ? []
        : contestantsText
            .split(/\n+/)
            .map((l) => l.trim())
            .filter(Boolean)
            .map((line) => {
              const [slug, name, photoUrl] = line.split('|').map((s) => s?.trim());
              return { slug: slug || name?.toLowerCase().replace(/\s+/g, '-'), name: name || slug, photoUrl };
            });
      type NonBracketPayload = { title: string; description?: string; contestants: { name: string; slug: string; photoUrl?: string }[] };
      type BracketPayload = { title: string; description?: string; participantsCount: number; matchSize: number };
      const payload: NonBracketPayload | BracketPayload = bracketMode
        ? { title, description, participantsCount, matchSize }
        : { title, description, contestants };
      const res = await fetch('/api/admin/contests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'No se pudo crear el contest');
        return;
      }
      const json = await res.json();
      window.location.href = `/contest/${json.contest.id}`;
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        <input id="bracketMode" type="checkbox" className="h-4 w-4 rounded border-white/20" checked={bracketMode} onChange={(e) => setBracketMode(e.target.checked)} />
        <label htmlFor="bracketMode" className="text-sm">Generar organigrama (bracket) automáticamente</label>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">Título</label>
        <input
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 disabled:opacity-50"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">Descripción</label>
        <textarea
          className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 disabled:opacity-50"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {!bracketMode && (
        <div>
          <label className="block text-sm font-medium text-foreground">Participantes (una por línea: slug|name|photoUrl)</label>
          <textarea
            className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 disabled:opacity-50 h-40"
            placeholder="a|Participante A\nb|Participante B"
            value={contestantsText}
            onChange={(e) => setContestantsText(e.target.value)}
          />
        </div>
      )}
      {bracketMode && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground">N.º de participantes esperados</label>
            <input
              type="number"
              min={matchSize}
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 disabled:opacity-50"
              value={participantsCount}
              onChange={(e) => setParticipantsCount(Math.max(matchSize, parseInt(e.target.value) || matchSize))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Participantes por match</label>
            <select
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60"
              value={matchSize}
              onChange={(e) => {
                const v = Math.max(2, parseInt(e.target.value) || 2);
                setMatchSize(v);
                setParticipantsCount((pc) => Math.max(v, pc));
              }}
            >
              <option value={2}>2 vs 2</option>
              <option value={3}>3 vs 3</option>
              <option value={4}>4 vs 4</option>
            </select>
          </div>
        </div>
      )}
      <button type="submit" disabled={saving} className={`px-3 py-1 rounded text-white ${saving ? 'bg-gray-400' : 'bg-blue-600'}`}>
        {saving ? 'Guardando…' : 'Crear'}
      </button>
    </form>
  );
}
