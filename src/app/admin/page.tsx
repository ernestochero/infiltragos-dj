'use client';
import { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import Column from '@/components/kanban/Column';
import type { Request, RequestStatus } from '@prisma/client';

 type BoardState = Record<RequestStatus, Request[]>;
 const STATUSES: RequestStatus[] = ['PENDING', 'PLAYING', 'DONE', 'REJECTED'];

 export default function AdminPage() {
   const [board, setBoard] = useState<BoardState>({
     PENDING: [],
     PLAYING: [],
     DONE: [],
     REJECTED: [],
   });

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
            draft.DONE.push(prev);
          }
        }
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

   return (
     <main className="p-4">
       <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
           {STATUSES.map((status) => (
             <Column key={status} title={status} status={status} items={board[status]} />
           ))}
         </div>
       </DndContext>
     </main>
   );
 }
