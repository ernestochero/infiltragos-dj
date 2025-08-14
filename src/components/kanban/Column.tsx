'use client';
import type { Request, RequestStatus } from '@prisma/client';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import Card from './Card';

interface ColumnProps {
  title: string;
  status: RequestStatus;
  items: Request[];
}

export default function Column({ title, status, items }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });
  const highlight =
    status === 'PLAYING'
      ? 'bg-yellow-100 border-yellow-400'
      : 'bg-slate-100 border-slate-300';
  return (
    <div ref={setNodeRef} className={`flex flex-col rounded border p-2 ${highlight}`}>
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex-1 overflow-y-auto space-y-2">
          {items.map((item) => (
            <Card key={item.id} request={item} />
          ))}
        </ul>
      </SortableContext>
    </div>
  );
}
