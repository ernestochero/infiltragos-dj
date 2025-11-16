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

  function formatDateToDisplay(dateInput?: Date | string | null) {
    if (!dateInput) return "";
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (Number.isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hoursStr = String(hours).padStart(2, "0");
    return `${day}/${month}/${year} - ${hoursStr}:${minutes} ${ampm}`;
  }

  const createdAtStr = formatDateToDisplay(request.createdAt);

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
        {/* {request.isKaraoke ? (
          <span className="inline-block px-2 py-0.5 rounded bg-accent text-xs font-semibold text-dark-bg">
            Karaoke
          </span>
        ) : (
          <span className="inline-block px-2 py-0.5 rounded bg-red-500 text-xs font-semibold text-white">
            DJ
          </span>
        )} */}
        {/* <span className="inline-block text-xs text-slate-400 font-mono">
          Votos: {request.votes}
        </span> */}
        {request.tableOrName ? (
          <span className="inline-block text-xs text-slate-400 truncate font-mono">
            {request.tableOrName}
          </span>
        ) : (
          <span className="inline-block text-xs text-slate-400 font-mono">
            Pedido
          </span>
        )}
        <span className="ml-auto text-xs text-slate-400 font-mono">
          {createdAtStr}
        </span>
      </div>
      <div className="font-bold text-base truncate">{request.songTitle}</div>
      <div className="text-sm text-slate-300 truncate">{request.artist}</div>
    </li>
  );
}
