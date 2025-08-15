'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Request } from '@prisma/client';

export default function Card({ request }: { request: Request }) {
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
      className="border p-2 rounded bg-slate-800 text-slate-100 hover:bg-slate-700 focus:bg-slate-700 focus:outline-none"
      {...attributes}
      {...listeners}
    >
      {request.songTitle} - {request.artist} - Votes ({request.votes})
    </li>
  );
}
