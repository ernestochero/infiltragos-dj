"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Column from "@dj/components/kanban/Column";
import type { Request, RequestStatus } from "@prisma/client";
import { filterRecent } from "@dj/lib/filterRecent";

type BoardState = Record<RequestStatus, Request[]>;
const STATUSES: RequestStatus[] = ["PENDING", "PLAYING", "DONE", "REJECTED"];

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "PENDIENTES",
  PLAYING: "REPRODUCIENDO",
  DONE: "COMPLETADAS",
  REJECTED: "RECHAZADAS",
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
  const [rawRequests, setRawRequests] = useState<Request[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const analytics = useMemo(() => {
    const statusTemplate: Record<RequestStatus, number> = {
      PENDING: 0,
      PLAYING: 0,
      DONE: 0,
      REJECTED: 0,
    };
    const base = {
      totalDemand: 0,
      uniqueSongs: 0,
      uniqueArtists: 0,
      karaokeDemand: 0,
      djDemand: 0,
      statusCounts: { ...statusTemplate },
      topSongs: [] as {
        title: string;
        artist: string;
        total: number;
        karaoke: number;
        dj: number;
      }[],
      topArtists: [] as {
        artist: string;
        total: number;
        karaoke: number;
        dj: number;
      }[],
      weeklyTopSongs: [] as {
        title: string;
        artist: string;
        total: number;
        karaoke: number;
        dj: number;
      }[],
    };

    if (rawRequests.length === 0) return base;

    const songTotals = new Map<
      string,
      {
        title: string;
        artist: string;
        total: number;
        karaoke: number;
        dj: number;
      }
    >();
    const songWeekly = new Map<
      string,
      {
        title: string;
        artist: string;
        total: number;
        karaoke: number;
        dj: number;
      }
    >();
    const artistTotals = new Map<
      string,
      { artist: string; total: number; karaoke: number; dj: number }
    >();
    const uniqueSongs = new Set<string>();
    const uniqueArtists = new Set<string>();
    const weekCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    let totalDemand = 0;
    let karaokeDemand = 0;

    for (const req of rawRequests) {
      const demand = (req.votes ?? 0) + 1;
      totalDemand += demand;
      base.statusCounts[req.status] = (base.statusCounts[req.status] || 0) + 1;
      if (req.isKaraoke) karaokeDemand += demand;

      uniqueSongs.add(
        `${req.songTitle.toLowerCase()}::${req.artist.toLowerCase()}`
      );
      uniqueArtists.add(req.artist.toLowerCase());

      const songKey = `${req.songTitle}::${req.artist}`;
      const targetMap = songTotals;
      if (!targetMap.has(songKey)) {
        targetMap.set(songKey, {
          title: req.songTitle,
          artist: req.artist,
          total: 0,
          karaoke: 0,
          dj: 0,
        });
      }
      const entry = targetMap.get(songKey)!;
      entry.total += demand;
      if (req.isKaraoke) {
        entry.karaoke += demand;
      } else {
        entry.dj += demand;
      }

      const artistKey = req.artist;
      if (!artistTotals.has(artistKey)) {
        artistTotals.set(artistKey, {
          artist: req.artist,
          total: 0,
          karaoke: 0,
          dj: 0,
        });
      }
      const artistEntry = artistTotals.get(artistKey)!;
      artistEntry.total += demand;
      if (req.isKaraoke) {
        artistEntry.karaoke += demand;
      } else {
        artistEntry.dj += demand;
      }

      const createdAtValue = req.createdAt
        ? new Date(req.createdAt).getTime()
        : NaN;
      if (Number.isFinite(createdAtValue) && createdAtValue >= weekCutoff) {
        if (!songWeekly.has(songKey)) {
          songWeekly.set(songKey, {
            title: req.songTitle,
            artist: req.artist,
            total: 0,
            karaoke: 0,
            dj: 0,
          });
        }
        const weeklyEntry = songWeekly.get(songKey)!;
        weeklyEntry.total += demand;
        if (req.isKaraoke) {
          weeklyEntry.karaoke += demand;
        } else {
          weeklyEntry.dj += demand;
        }
      }
    }

    base.totalDemand = totalDemand;
    base.karaokeDemand = karaokeDemand;
    base.djDemand = totalDemand - karaokeDemand;
    base.uniqueSongs = uniqueSongs.size;
    base.uniqueArtists = uniqueArtists.size;
    base.topSongs = Array.from(songTotals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    base.topArtists = Array.from(artistTotals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    base.weeklyTopSongs = Array.from(songWeekly.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return base;
  }, [rawRequests]);

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
    const res = await fetch("/api/requests");
    const list: Request[] = await res.json();
    setRawRequests(list);
    const grouped: BoardState = {
      PENDING: [],
      PLAYING: [],
      DONE: [],
      REJECTED: [],
    };
    const ordered = [...list].sort((a, b) => a.sortIndex - b.sortIndex);
    for (const item of ordered) {
      grouped[item.status].push(item);
    }
    grouped.DONE = filterRecent(grouped.DONE);
    grouped.REJECTED = filterRecent(grouped.REJECTED);
    setBoard(grouped);
    setLastUpdated(new Date());
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
          toCol === "PLAYING" &&
          prevPlayingTop &&
          prevPlayingTop.id !== String(active.id)
        ) {
          // remove previous playing from wherever it currently is in the draft
          const prevIdx = draft.PLAYING.findIndex(
            (r) => r.id === prevPlayingTop.id
          );
          if (prevIdx !== -1) {
            const [prev] = draft.PLAYING.splice(prevIdx, 1);
            prev.status = "DONE";
            prev.sortIndex = draft.DONE.length;
            prev.updatedAt = new Date();
            draft.DONE.push(prev);
          }
        }

        draft.DONE = filterRecent(draft.DONE);
        draft.REJECTED = filterRecent(draft.REJECTED);
      });

      try {
        // persist primary change (moved card)
        await fetch(`/api/requests/${active.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: toCol,
            sortIndex: board[toCol].length,
          }),
        });

        // persist auto-advance if applicable
        if (
          toCol === "PLAYING" &&
          prevPlayingTop &&
          prevPlayingTop.id !== String(active.id)
        ) {
          await fetch(`/api/requests/${prevPlayingTop.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "DONE",
              sortIndex: board.DONE.length,
            }),
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
        await fetch("/api/requests/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            columnStatus: fromCol,
            orderedIds: newColumn.map((i) => i.id),
          }),
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
      moved.status = "PLAYING";
      moved.sortIndex = draft.PLAYING.length;
      moved.updatedAt = new Date();
      draft.PLAYING.push(moved);

      if (prevPlayingTop && prevPlayingTop.id !== item.id) {
        const prevIdx = draft.PLAYING.findIndex(
          (r) => r.id === prevPlayingTop.id
        );
        if (prevIdx !== -1) {
          const [prev] = draft.PLAYING.splice(prevIdx, 1);
          prev.status = "DONE";
          prev.sortIndex = draft.DONE.length;
          prev.updatedAt = new Date();
          draft.DONE.push(prev);
        }
      }

      draft.DONE = filterRecent(draft.DONE);
      draft.REJECTED = filterRecent(draft.REJECTED);
    });

    try {
      await fetch(`/api/requests/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PLAYING",
          sortIndex: board.PLAYING.length,
        }),
      });

      if (prevPlayingTop && prevPlayingTop.id !== item.id) {
        await fetch(`/api/requests/${prevPlayingTop.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "DONE",
            sortIndex: board.DONE.length,
          }),
        });
      }
    } catch {
      rollback();
    }
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  const statusSnapshot = {
    pending: board.PENDING.length,
    playing: board.PLAYING.length,
    doneRecent: board.DONE.length,
    rejectedRecent: board.REJECTED.length,
  };

  const karaokeShare = analytics.totalDemand
    ? Math.round((analytics.karaokeDemand / analytics.totalDemand) * 100)
    : 0;

  const lastSyncLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <main className="relative p-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap mb-4 gap-4">
        <h2 className="text-lg font-semibold text-white">Kanban de pedidos</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnalytics(true)}
            disabled={showAnalytics}
            className="rounded-full border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 shadow hover:border-slate-400 hover:text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            Ver estadísticas
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-blue-500 underline"
          >
            Logout
          </button>
        </div>
      </div>
      {showAnalytics ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4"
          onClick={() => setShowAnalytics(false)}
        >
          <div
            className="relative w-full max-w-6xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-6 shadow-2xl max-h-[90vh]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  Estadísticas de pedidos
                </h2>
                <p className="text-sm text-slate-400">
                  Última sync: {lastSyncLabel}
                </p>
              </div>
              <button
                onClick={() => setShowAnalytics(false)}
                className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-sm font-medium text-slate-200 shadow hover:border-slate-400 hover:text-white transition"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-6 space-y-6">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 shadow">
                  <p className="text-sm text-slate-400">Pedidos totales</p>
                  <p className="mt-1 text-3xl font-semibold">
                    {analytics.totalDemand}
                  </p>
                  <p className="text-xs text-slate-500">
                    Incluye votos acumulados
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 shadow">
                  <p className="text-sm text-slate-400">Canciones únicas</p>
                  <p className="mt-1 text-3xl font-semibold">
                    {analytics.uniqueSongs}
                  </p>
                  <p className="text-xs text-slate-500">
                    Artistas distintos: {analytics.uniqueArtists}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 shadow">
                  <p className="text-sm text-slate-400">Modo karaoke</p>
                  <p className="mt-1 text-3xl font-semibold">
                    {analytics.karaokeDemand}
                  </p>
                  <p className="text-xs text-slate-500">
                    {karaokeShare}% del total · DJ: {analytics.djDemand}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 shadow">
                  <p className="text-sm text-slate-400">Estado en vivo</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-300">
                    <li>Pendientes: {statusSnapshot.pending}</li>
                    <li>Reproduciendo: {statusSnapshot.playing}</li>
                    <li>Última hora (done): {statusSnapshot.doneRecent}</li>
                    <li>
                      Rechazadas (reciente): {statusSnapshot.rejectedRecent}
                    </li>
                  </ul>
                </div>
              </section>
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 shadow">
                  <h3 className="text-lg font-semibold text-white">
                    Top canciones (histórico)
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {analytics.topSongs.length === 0 ? (
                      <li className="text-sm text-slate-500">
                        Sin registros todavía.
                      </li>
                    ) : (
                      analytics.topSongs.map((item, idx) => (
                        <li
                          key={`${item.title}-${item.artist}`}
                          className="flex items-center justify-between rounded-md bg-slate-800/60 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              #{idx + 1} {item.title}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.artist}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-accent">
                              {item.total}
                            </p>
                            <p className="text-[10px] uppercase tracking-wide text-slate-500">
                              Karaoke {item.karaoke} · DJ {item.dj}
                            </p>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 shadow">
                  <h3 className="text-lg font-semibold text-white">
                    Top canciones (últimos 7 días)
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {analytics.weeklyTopSongs.length === 0 ? (
                      <li className="text-sm text-slate-500">
                        Aún no hay suficientes pedidos esta semana.
                      </li>
                    ) : (
                      analytics.weeklyTopSongs.map((item, idx) => (
                        <li
                          key={`weekly-${item.title}-${item.artist}`}
                          className="flex items-center justify-between rounded-md bg-slate-800/60 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              #{idx + 1} {item.title}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.artist}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-emerald-400">
                              {item.total}
                            </p>
                            <p className="text-[10px] uppercase tracking-wide text-slate-500">
                              Karaoke {item.karaoke} · DJ {item.dj}
                            </p>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </section>
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 shadow">
                  <h3 className="text-lg font-semibold text-white">
                    Top artistas
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {analytics.topArtists.length === 0 ? (
                      <li className="text-sm text-slate-500">
                        Sin artistas destacados todavía.
                      </li>
                    ) : (
                      analytics.topArtists.map((artist, idx) => (
                        <li
                          key={artist.artist}
                          className="flex items-center justify-between rounded-md bg-slate-800/60 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              #{idx + 1} {artist.artist}
                            </p>
                            <p className="text-[10px] uppercase tracking-wide text-slate-500">
                              Karaoke {artist.karaoke} · DJ {artist.dj}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-indigo-300">
                            {artist.total}
                          </p>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 shadow">
                  <h3 className="text-lg font-semibold text-white">
                    Distribución histórica
                  </h3>
                  <ul className="mt-4 space-y-2 text-sm text-slate-300">
                    <li>
                      Pendientes creadas: {analytics.statusCounts.PENDING}
                    </li>
                    <li>
                      Marcadas como reproduciendo:{" "}
                      {analytics.statusCounts.PLAYING}
                    </li>
                    <li>Completadas: {analytics.statusCounts.DONE}</li>
                    <li>Rechazadas: {analytics.statusCounts.REJECTED}</li>
                  </ul>
                  <p className="mt-3 text-xs text-slate-500">
                    Cada registro contabiliza la canción única en la tabla de
                    pedidos. Usa estos totales para medir el embudo general.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
      <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 shadow">
        <DndContext
          sensors={sensors}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={(e) => {
            setActiveId(null);
            handleDragEnd(e);
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {STATUSES.map((status) => (
              <Column
                key={status}
                title={STATUS_LABELS[status]}
                status={status}
                items={board[status]}
                onItemClick={status === "PENDING" ? handleCardClick : undefined}
              />
            ))}
          </div>
          <DragOverlay
            dropAnimation={{
              duration: 280,
              easing: "cubic-bezier(0.2, 0.8, 0, 1)",
            }}
          >
            {activeId ? (
              <div className="rounded bg-slate-700 text-white px-3 py-2 shadow-lg">
                {(() => {
                  const it = findById(board, activeId!);
                  return it
                    ? `${it.songTitle} — ${it.artist}${
                        it.tableOrName ? ` · ${it.tableOrName}` : ""
                      }`
                    : "Moviendo…";
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </section>
    </main>
  );
}
