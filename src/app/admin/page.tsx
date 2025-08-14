'use client';
import { useState, useEffect } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Request {
  id: string;
  songTitle: string;
  artist: string;
  status: string;
  votes: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Sortable list item using dnd-kit.
 * IMPORTANT: You must spread {...attributes} and {...listeners} on the draggable handle
 * and attach ref={setNodeRef} to the root element.
 */
function SortableItem({ request }: { request: Request }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: request.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: 'grab',
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="border p-2 rounded bg-slate-900 text-slate-100"
      {...attributes}
      {...listeners}
    >
      {request.songTitle} - {request.artist} ({request.status}) - Votes ({request.votes})
    </li>
  );
}

export default function AdminPage() {
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    fetcher('/api/requests').then(setRequests);
  }, []);

  // Sensors tell dnd-kit how to detect user input (mouse/touch/pen).
  // Add an activationConstraint so a tiny click doesn't start a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // start dragging after 8px movement
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setRequests((items) => {
      const oldIndex = items.findIndex((i) => i.id === String(active.id));
      const newIndex = items.findIndex((i) => i.id === String(over.id));
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });

    // TODO: optionally persist new order to backend here
    // fetch('/api/requests/reorder', { method: 'POST', body: JSON.stringify(newOrder) })
  };

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold mb-4">Admin</h1>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {/* SortableContext items must be the list of item IDs */}
        <SortableContext
          items={requests.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {requests.map((r) => (
              <SortableItem key={r.id} request={r} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </main>
  );
}
