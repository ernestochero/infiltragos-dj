"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Request } from "@prisma/client";

interface CardProps {
  request: Request;
  onClick?: () => void;
}

export default function Card({ request, onClick }: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: request.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab",
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="border p-2 rounded bg-slate-800 text-slate-100 hover:bg-slate-700 focus:bg-slate-700 focus:outline-none"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        {request.isKaraoke ? (
          <span className="inline-block px-2 py-0.5 rounded bg-accent text-xs font-semibold text-dark-bg">
            Karaoke
          </span>
        ) : (
          <span className="inline-block px-2 py-0.5 rounded bg-red-500 text-xs font-semibold text-white">
            DJ
          </span>
        )}
        {request.tableOrName && (
          <span className="text-xs text-slate-200 truncate font-mono">
            {request.tableOrName}
          </span>
        )}
        <span className="ml-auto text-xs text-slate-400 font-mono">
          Votos: {request.votes}
        </span>
      </div>
      <div className="font-bold text-base truncate">{request.songTitle}</div>
      <div className="text-sm text-slate-300 truncate">{request.artist}</div>
    </li>
  );
}
