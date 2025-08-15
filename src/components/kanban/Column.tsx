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

// Background + border per column status
const bgBorderByStatus: Record<RequestStatus, string> = {
  PENDING: 'bg-slate-100 border-slate-300',
  PLAYING: 'bg-amber-50 border-amber-300',
  DONE: 'bg-emerald-50 border-emerald-300',
  REJECTED: 'bg-rose-50 border-rose-300',
};

// Header colors per status
const headerByStatus: Record<RequestStatus, string> = {
  PENDING: 'bg-slate-200 text-slate-800',
  PLAYING: 'bg-amber-200 text-amber-900',
  DONE: 'bg-slate-200 text-slate-800',
  REJECTED: 'bg-rose-200 text-rose-900',
};

export default function Column({ title, status, items }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={`flex flex-col rounded border ${bgBorderByStatus[status]} min-w-[280px]`}
      aria-label={`${title} column`}
    >
      {/* Sticky header with strong contrast */}
      <header
        className={`sticky top-0 z-10 rounded-t border-b px-3 py-2 text-sm font-extrabold tracking-wide ${headerByStatus[status]}`}
      >
        <div className="flex items-center justify-between">
          <span className="uppercase">{title}</span>
          <span className="text-xs opacity-70">{items.length}</span>
        </div>
      </header>

      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex-1 overflow-y-auto p-3 space-y-3">
          {items.map((item) => (
            <Card key={item.id} request={item} />
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}