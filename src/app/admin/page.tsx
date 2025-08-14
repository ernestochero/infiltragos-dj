'use client';
import { useState, useEffect } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface Request {
  id: string;
  songTitle: string;
  artist: string;
  status: string;
  votes: number;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  useEffect(() => {
    fetcher('/api/requests').then(setRequests);
  }, []);
  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold mb-4">Admin</h1>
      <DndContext sensors={sensors}
        onDragEnd={({ active, over }) => {
          if (active.id !== over?.id) {
            setRequests((items) => {
              const oldIndex = items.findIndex(i => i.id === active.id);
              const newIndex = items.findIndex(i => i.id === over?.id);
              return arrayMove(items, oldIndex, newIndex);
            });
          }
        }}>
        <SortableContext items={requests} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {requests.map(r => (
              <li key={r.id} id={r.id} className="border p-2 rounded">
                {r.songTitle} - {r.artist} ({r.status})
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </main>
  );
}
