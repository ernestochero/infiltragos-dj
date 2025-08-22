'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import Column from '@/components/kanban/Column';
import type { Request, RequestStatus } from '@prisma/client';

 type BoardState = Record<RequestStatus, Request[]>;
 const STATUSES: RequestStatus[] = ['PENDING', 'PLAYING', 'DONE', 'REJECTED'];

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'PENDIENTES',
  PLAYING: 'REPRODUCIENDO',
  DONE: 'COMPLETADAS',
  REJECTED: 'RECHAZADAS',
};

 const filterRecentDone = (list: Request[]) => {
   const cutoff = Date.now() - 60 * 60 * 1000;
   return list
     .filter((r) => new Date(r.updatedAt).getTime() >= cutoff)
     .sort(
       (a, b) =>
         new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
     )
     .slice(0, 10);
 };

const findById = (board: BoardState, id: string) => {
  for (const s of STATUSES) {
    const f = board[s].find((r) => r.id === id);
    if (f) return f;
  }
  return null;
};

export default function AdminPage() {
  const router = useRouter();
  const [board, setBoard] = useState<BoardState>({
     PENDING: [],
     PLAYING: [],
     DONE: [],
     REJECTED: [],
   });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const optimisticUpdate = (fn: (draft: BoardState) => void) => {
    const prev = structuredClone(board);
    setBoard((curr) => {
      const draft = structuredClone(curr);
      fn(draft);
      return draft;
    });
    return () => setBoard(prev);
  };

  const fetchData = async () => {
    const res = await fetch('/api/requests');
    const list: Request[] = await res.json();
    const grouped: BoardState = { PENDING: [], PLAYING: [], DONE: [], REJECTED: [] };
    list.sort((a, b) => a.sortIndex - b.sortIndex);
    for (const item of list) {
      grouped[item.status].push(item);
    }
    grouped.DONE = filterRecentDone(grouped.DONE);
    setBoard(grouped);
  };

   useEffect(() => {
     fetchData();
     const id = setInterval(fetchData, 10000);
     return () => clearInterval(id);
   }, []);

  const findColumn = (id: string): RequestStatus | undefined => {
    return STATUSES.find((status) => board[status].some((r) => r.id === id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
     const { active, over } = event;
     if (!over) return;
     const fromCol = findColumn(String(active.id));
     const overId = String(over.id);
     const toCol = STATUSES.includes(overId as RequestStatus)
       ? (overId as RequestStatus)
       : findColumn(overId);
    if (!fromCol || !toCol) return;

    if (fromCol !== toCol) {
      // capture who was playing before the move
      const prevPlayingTop = board.PLAYING[0];

      const rollback = optimisticUpdate((draft) => {
        // remove from source column
        const fromItems = draft[fromCol];
        const idx = fromItems.findIndex((i) => i.id === active.id);
        const [item] = fromItems.splice(idx, 1);

        // insert into destination column
        const toItems = draft[toCol];
        item.status = toCol;
        item.sortIndex = toItems.length;
        item.updatedAt = new Date();
        toItems.push(item);

        // AUTO-ADVANCE:
        // if we dropped into PLAYING and there was a previously playing item,
        // move that previous one to DONE automatically
        if (
          toCol === 'PLAYING' &&
          prevPlayingTop &&
          prevPlayingTop.id !== String(active.id)
        ) {
          // remove previous playing from wherever it currently is in the draft
          const prevIdx = draft.PLAYING.findIndex((r) => r.id === prevPlayingTop.id);
          if (prevIdx !== -1) {
            const [prev] = draft.PLAYING.splice(prevIdx, 1);
            prev.status = 'DONE';
            prev.sortIndex = draft.DONE.length;
            prev.updatedAt = new Date();
            draft.DONE.push(prev);
          }
        }

        draft.DONE = filterRecentDone(draft.DONE);
      });

      try {
        // persist primary change (moved card)
        await fetch(`/api/requests/${active.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: toCol, sortIndex: board[toCol].length }),
        });

        // persist auto-advance if applicable
        if (
          toCol === 'PLAYING' &&
          prevPlayingTop &&
          prevPlayingTop.id !== String(active.id)
        ) {
          await fetch(`/api/requests/${prevPlayingTop.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'DONE', sortIndex: board.DONE.length }),
          });
        }
      } catch {
        rollback();
      }
    } else {
      const column = board[fromCol];
      const oldIndex = column.findIndex((i) => i.id === active.id);
      const overIndex = column.findIndex((i) => i.id === overId);
      if (oldIndex === -1 || overIndex === -1) return;
      const newColumn = arrayMove(column, oldIndex, overIndex);
      const rollback = optimisticUpdate((draft) => {
        draft[fromCol] = newColumn;
      });
      try {
        await fetch('/api/requests/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columnStatus: fromCol, orderedIds: newColumn.map((i) => i.id) }),
        });
      } catch {
        rollback();
      }
    }
  };

  const handleCardClick = async (item: Request) => {
    const prevPlayingTop = board.PLAYING[0];
    const rollback = optimisticUpdate((draft) => {
      const fromIdx = draft.PENDING.findIndex((r) => r.id === item.id);
      if (fromIdx === -1) return;
      const [moved] = draft.PENDING.splice(fromIdx, 1);
      moved.status = 'PLAYING';
      moved.sortIndex = draft.PLAYING.length;
      moved.updatedAt = new Date();
      draft.PLAYING.push(moved);

      if (prevPlayingTop && prevPlayingTop.id !== item.id) {
        const prevIdx = draft.PLAYING.findIndex((r) => r.id === prevPlayingTop.id);
        if (prevIdx !== -1) {
          const [prev] = draft.PLAYING.splice(prevIdx, 1);
          prev.status = 'DONE';
          prev.sortIndex = draft.DONE.length;
          prev.updatedAt = new Date();
          draft.DONE.push(prev);
        }
      }

      draft.DONE = filterRecentDone(draft.DONE);
    });

    try {
      await fetch(`/api/requests/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PLAYING', sortIndex: board.PLAYING.length }),
      });

      if (prevPlayingTop && prevPlayingTop.id !== item.id) {
        await fetch(`/api/requests/${prevPlayingTop.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'DONE', sortIndex: board.DONE.length }),
        });
      }
    } catch {
      rollback();
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <main className="p-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={handleLogout}
          className="text-sm text-blue-500 underline"
        >
          Logout
        </button>
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={(e) => { setActiveId(null); handleDragEnd(e); }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map((status) => (
            <Column
              key={status}
              title={STATUS_LABELS[status]}
              status={status}
              items={board[status]}
              onItemClick={status === 'PENDING' ? handleCardClick : undefined}
            />
          ))}
        </div>
        <DragOverlay
          dropAnimation={{ duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0, 1)' }}
        >
          {activeId ? (
            <div className="rounded bg-slate-700 text-white px-3 py-2 shadow-lg">
              {(() => {
                const it = findById(board, activeId!);
                return it
                  ? `${it.songTitle} — ${it.artist}${it.tableOrName ? ` · ${it.tableOrName}` : ''}`
                  : 'Moviendo…';
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
}
