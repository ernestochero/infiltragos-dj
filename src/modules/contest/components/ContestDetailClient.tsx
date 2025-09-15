"use client";
import { useState } from 'react';
import BracketView from '@/modules/contest/components/BracketView';

type Contestant = { id: string; name: string; slug: string };
type Poll = {
  id: string; title: string; round: number; startAt: string; endAt: string;
  nextPollId?: string | null; nextSlot?: number | null;
  contestants: { id: string; contestantId: string }[];
};

// UI de creación manual removida; toda la gestión se hace desde el Bracket

export default function ContestDetailClient({ contestId, contestants, polls: initialPolls }: { contestId: string; contestants: Contestant[]; polls: Poll[] }) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [people, setPeople] = useState<Contestant[]>(contestants);


  async function createContestant(name: string, photoUrl?: string) {
    try {
      const res = await fetch(`/api/admin/contests/${contestId}/contestants`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, photoUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'No se pudo crear participante');
        return null;
      }
      const c = (await res.json()) as Contestant;
      setPeople(prev => [...prev, c]);
      return c;
    } catch {
      alert('No se pudo crear participante');
      return null;
    }
  }
  async function addToPoll(pollId: string, ids: string[]) {
    if (!ids || ids.length === 0) return;
    const res = await fetch(`/api/admin/polls/${pollId}/contestants`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contestantIds: ids }) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'No se pudo agregar'); return; }
    const updated = await res.json();
    setPolls(ps => ps.map(p => p.id === pollId ? { ...p, contestants: updated.contestants } : p));
  }

  async function removeFromPoll(pollId: string, contestantId: string) {
    const res = await fetch(`/api/admin/polls/${pollId}/contestants?contestantId=${encodeURIComponent(contestantId)}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'No se pudo quitar'); return; }
    const updated = await res.json();
    setPolls(ps => ps.map(p => p.id === pollId ? { ...p, contestants: updated.contestants } : p));
  }

  async function updateContestant(id: string, data: Partial<Contestant & { photoUrl?: string }>) {
    const res = await fetch(`/api/admin/contestants/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || 'No se pudo actualizar'); return; }
    const updated = await res.json();
    setPeople(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
  }

  return (
    <div className="space-y-6">
      <BracketView
        polls={polls}
        contestants={people}
        onAddToPoll={(pollId, ids) => addToPoll(pollId, ids)}
        onRemoveFromPoll={(pollId, id) => removeFromPoll(pollId, id)}
        onCreateContestant={createContestant}
        onUpdateContestant={(id, data) => updateContestant(id, data)}
      />
    </div>
  );
}
