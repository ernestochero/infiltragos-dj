"use client";
import useSWR from "swr";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import FirstVisitModal from "../../modules/dj/components/FirstVisitModal";
import { FaCirclePlay, FaThumbsUp, FaMusic } from "react-icons/fa6";

const ModalRequestForm = dynamic(
  () => import("@/modules/dj/components/ModalRequestForm"),
  {
    loading: () => (
      <p className="text-gray-300 text-center">Cargando formulario…</p>
    ),
    ssr: false,
  }
);

type RequestStatus = "PENDING" | "PLAYING" | "DONE" | "REJECTED";

interface Request {
  id: string;
  songTitle: string;
  artist: string;
  votes: number;
  status: RequestStatus;
  tableOrName?: string;
  createdAt?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function QueuePage() {
  const { data, isLoading, mutate } = useSWR<Request[]>(
    "/api/requests",
    fetcher,
    {
      refreshInterval: 8000,
    }
  );

  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);

  function handleSuccess() {
    setOpen(false);
    setToast(true);
    mutate();
    setTimeout(() => setToast(false), 3000);
  }

  const { nowPlaying, pending } = useMemo(() => {
    const list = data ?? [];
    const playing = list.find((r) => r.status === "PLAYING");
    const pendingSorted = list
      .filter((r) => r.status === "PENDING")
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    return { nowPlaying: playing, pending: pendingSorted };
  }, [data]);

  return (
    <main className="bg-dark-bg min-h-screen text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Infiltragos Music
          </h1>
          <p className="text-sm md:text-base text-gray-400 mt-2">
            ¡Acompaña tus tragos con la mejor música a un solo click!
          </p>
        </header>
        <div className="mb-8 flex justify-center">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-dark-bg shadow-lg transition-all duration-300 hover:bg-accent-hover hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover focus-visible:ring-offset-2 focus-visible:ring-offset-dark-bg"
          >
            🎵 Pedir una Canción
          </button>
        </div>

        {/* Reproduciendo Ahora */}
        <section aria-labelledby="now-playing" className="mb-8">
          <h2 id="now-playing" className="sr-only">
            Reproduciendo Ahora
          </h2>
          {isLoading ? (
            <div className="animate-pulse rounded-xl bg-card-bg p-6 h-32" />
          ) : nowPlaying ? (
            <div className="rounded-xl bg-card-bg p-6 flex items-center gap-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-50 z-0"></div>
              <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 z-10">
                <FaCirclePlay className="text-5xl text-accent opacity-80 animate-pulse" />
              </div>
              <div className="flex-grow z-10">
                <span className="inline-flex items-center gap-2 text-accent text-sm font-semibold uppercase">
                  <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
                  Reproduciendo
                </span>
                <p className="mt-1 text-2xl font-bold text-white">
                  {nowPlaying.songTitle}{" "}
                  <span className="font-medium text-gray-400">
                    - {nowPlaying.artist}
                  </span>
                </p>
                {nowPlaying.tableOrName && (
                  <p className="text-sm mt-1 text-gray-500">
                    De: {nowPlaying.tableOrName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-xl font-bold text-gray-400 hover:text-accent transition-colors duration-300 z-10 cursor-pointer">
                <FaThumbsUp />
                <span>{nowPlaying.votes}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-card-bg p-6 text-gray-500 text-center">
              Sin reproducciones actualmente.
            </div>
          )}
        </section>

        {/* Solicitudes Pendientes */}
        <section aria-labelledby="pending-queue">
          <div className="flex items-baseline justify-between mb-4">
            <h2
              id="pending-queue"
              className="text-xl font-extrabold text-white tracking-wide"
            >
              Cola de Pedidos
            </h2>
            <span className="text-sm text-gray-500">
              {pending?.length ?? 0} items
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-4 bg-card-bg rounded-xl">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg bg-gray-700 p-4 h-16"
                />
              ))}
            </div>
          ) : pending && pending.length > 0 ? (
            <ul className="space-y-3 p-4 bg-card-bg rounded-xl max-h-96 overflow-y-auto overflow-x-hidden">
              {pending.map((r: Request, index: number) => (
                <li
                  key={r.id}
                  className="rounded-lg bg-gray-700/50 p-4 hover:bg-gray-700/70 transition-colors duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        <span className="text-gray-400 font-bold mr-2">
                          {index + 1}.
                        </span>
                        {r.songTitle}{" "}
                        <span className="font-normal text-gray-400">
                          - {r.artist}
                        </span>
                      </p>
                      {r.tableOrName && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          De: {r.tableOrName}
                        </p>
                      )}
                    </div>
                    <span className="whitespace-nowrap text-xs font-medium text-gray-400">
                      👍 {r.votes} votos
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl bg-card-bg p-6 text-gray-500 text-center">
              <FaMusic className="text-6xl text-gray-700 mx-auto mb-4" />
              <p>Sin Solicitudes Pendientes.</p>
            </div>
          )}
        </section>

        <ModalRequestForm
          open={open}
          onClose={() => setOpen(false)}
          titleId="request-form-title"
          title="Nuevo Pedido"
          onSuccess={handleSuccess}
        />
        <FirstVisitModal
          storageKey="welcomeSession"
          title="🍸 Bienvenido a Infiltragos Music"
          description="Aquí puedes pedir tus canciones favoritas para nuestras noches de karaoke o cuando el DJ esté en cabina. Solo busca tu canción, pídela y la podrás visualizar a la cola de pedidos. Es fácil, rápido y divertido: ¡tú eliges la música de la noche! 🍹🎤"
          buttonText="¡Entendido!"
        ></FirstVisitModal>
        {toast && (
          <div className="fixed bottom-4 right-4 rounded-md bg-emerald-600 text-white px-4 py-2 shadow-lg text-sm transition-all duration-300 transform translate-y-0 opacity-100">
            Solicitud enviada
          </div>
        )}
      </div>
    </main>
  );
}
