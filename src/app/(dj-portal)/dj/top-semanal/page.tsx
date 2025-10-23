"use client";

import Link from "next/link";
import useSWR from "swr";
import { useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaFire,
  FaMicrophoneLines,
  FaCirclePlay,
} from "react-icons/fa6";
import ModalRequestForm from "@/modules/dj/components/ModalRequestForm";
import type { TopEntry } from "@/modules/dj/lib/top";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface WeeklyTopResponse {
  data: TopEntry[];
  updatedAt: number;
}

export default function WeeklyTopPage() {
  const { data, isLoading, mutate, error } = useSWR<WeeklyTopResponse>(
    "/api/top/weekly",
    fetcher,
    {
      refreshInterval: 60_000,
    }
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ songTitle: string; artist: string }>(
    { songTitle: "", artist: "" }
  );
  const [toast, setToast] = useState(false);

  const weeklyTop = useMemo(() => {
    if (!data?.data) return [];
    return data.data.slice(0, 10);
  }, [data]);

  const updatedAtLabel = useMemo(() => {
    if (!data?.updatedAt) return "Top 10 semanal";
    try {
      const date = new Date(data.updatedAt);
      const formatted = date.toLocaleString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
      });
      return `Top 10 semanal · actualizado ${formatted}`;
    } catch {
      return "Top 10 semanal";
    }
  }, [data]);

  const showSkeleton = isLoading && !data;
  const isEmpty = !showSkeleton && !error && weeklyTop.length === 0;

  function openModalForSong(songTitle: string, artist: string) {
    setPrefill({ songTitle, artist });
    setModalOpen(true);
  }

  function handleSuccess() {
    setModalOpen(false);
    setToast(true);
    mutate();
    setTimeout(() => setToast(false), 3_000);
  }

  return (
    <main className="bg-dark-bg min-h-screen text-white p-4 md:p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/dj"
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:text-accent-hover"
          >
            <FaArrowLeft className="h-4 w-4" /> Volver a la cola
          </Link>
          <div className="text-sm text-gray-400">{updatedAtLabel}</div>
        </header>

        <section className="rounded-xl bg-card-bg p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <FaFire className="h-6 w-6 text-accent" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Top 10 semanal de pedidos
              </h1>
              <p className="text-sm text-gray-400">
                Canciones más pedidas en los últimos 7 días.
              </p>
            </div>
          </div>

          <div className="mt-6">
            {showSkeleton ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-20 animate-pulse rounded-lg bg-gray-700/40"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-lg bg-rose-500/10 p-6 text-center text-sm text-rose-200 border border-rose-500/20">
                No pudimos cargar el top semanal. Intenta más tarde.
              </div>
            ) : isEmpty ? (
              <div className="rounded-lg bg-gray-800/60 p-6 text-center text-sm text-gray-400">
                Aún no hay suficientes datos para el ranking semanal.
              </div>
            ) : (
              <ul className="space-y-4">
                {weeklyTop.map((entry, idx) => (
                  <li
                    key={`${entry.songTitle}-${entry.artist}`}
                    className="flex flex-col gap-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4 shadow-sm transition hover:border-accent/60 hover:bg-gray-800"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-400">
                          #{idx + 1}
                        </p>
                        <h2 className="text-xl font-bold text-white">
                          {entry.songTitle}
                        </h2>
                        <p className="text-sm text-gray-400">{entry.artist}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-300">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-accent">
                          <FaMicrophoneLines className="h-4 w-4" /> {entry.karaoke}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-3 py-1 text-indigo-300">
                          <FaCirclePlay className="h-4 w-4" /> {entry.dj}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-3 py-1 text-white">
                          Total {entry.total}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-gray-500">
                        Sumamos votos y repeticiones para calcular la demanda.
                      </p>
                      <button
                        onClick={() => openModalForSong(entry.songTitle, entry.artist)}
                        className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-dark-bg shadow transition hover:bg-accent-hover"
                      >
                        Pedir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <ModalRequestForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        title="Pedir canción"
        prefillSongTitle={prefill.songTitle}
        prefillArtist={prefill.artist}
      />

      {toast && (
        <div className="fixed bottom-4 right-4 rounded-md bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg transition-all duration-300">
          Canción enviada a la cola
        </div>
      )}
    </main>
  );
}
