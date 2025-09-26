"use client";
import useSWR from "swr";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import FirstVisitModal from "@/modules/dj/components/FirstVisitModal";
import LyricsModal from "@/modules/dj/components/LyricsModal";
import {
  FaCirclePlay,
  FaMicrophoneLines,
  FaThumbsUp,
  FaMusic,
  FaBookOpen,
} from "react-icons/fa6";

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
  isKaraoke: boolean;
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
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const LYRICS_FALLBACK_MSG =
    "No se pudo obtener la letra, pero te brindamos dos opciones extras donde puedes encontrarlas:";
  const LYRICS_TIMEOUT_MS = 5000;

  function applyLyricsPayload(payload: unknown) {
    const data = payload as { lyrics?: string | null };
    if (!data || !data.lyrics) {
      setLyricsError(LYRICS_FALLBACK_MSG);
      return;
    }
    setLyrics(data.lyrics);
  }

  const LYRICS_CACHE_KEY = "lyrics:current";

  function normalize(s: string) {
    return s.trim().toLowerCase();
  }

  function cleanupLegacyLyricsKeys() {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith("lyrics:") && k !== LYRICS_CACHE_KEY) toRemove.push(k);
      }
      for (const k of toRemove) localStorage.removeItem(k);
    } catch {
      // ignore
    }
  }

  function readCachedLyrics(artist: string, title: string): string | null {
    try {
      const raw = localStorage.getItem(LYRICS_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { artist: string; title: string; lyrics: string; ts?: number };
      if (normalize(parsed.artist) === normalize(artist) && normalize(parsed.title) === normalize(title)) {
        return parsed.lyrics || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  function writeCachedLyrics(artist: string, title: string, lyrics: string) {
    try {
      cleanupLegacyLyricsKeys();
      const payload = JSON.stringify({ artist, title, lyrics, ts: Date.now() });
      localStorage.setItem(LYRICS_CACHE_KEY, payload);
    } catch {
      // ignore quota/JSON errors
    }
  }

  async function handleShowLyrics(songTitle: string, artist: string) {
    setLyricsOpen(true);
    setLyrics(null);
    setLyricsError(null);
    setLyricsLoading(true);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      // Try client cache first
      const cached = readCachedLyrics(artist, songTitle);
      if (cached) {
        setLyrics(cached);
        return;
      }

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), LYRICS_TIMEOUT_MS);
      const res = await fetch(
        `/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(songTitle)}`,
        { signal: controller.signal }
      );

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Respuesta inesperada del servidor de letras.");
      }

      const reader = res.body?.getReader();
      let receivedLength = 0;
      const chunks: Uint8Array[] = [];
      const MAX_SIZE = 10 * 1024; // 10 KB

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          receivedLength += value.length;
          if (receivedLength > MAX_SIZE) {
            throw new Error("La letra es demasiado grande.");
          }
          chunks.push(value);
        }
        const full = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
          full.set(chunk, position);
          position += chunk.length;
        }
        const text = new TextDecoder("utf-8").decode(full);
        const json = JSON.parse(text);
        applyLyricsPayload(json);
        if (json?.lyrics) writeCachedLyrics(artist, songTitle, json.lyrics);
      } else {
        const json = await res.json();
        applyLyricsPayload(json);
        if (json?.lyrics) writeCachedLyrics(artist, songTitle, json.lyrics);
      }
    } catch {
      // Abort o error de red/servidor
      setLyricsError(LYRICS_FALLBACK_MSG);
    } finally {
      // clear timeout if set
      try { if (timeoutId) clearTimeout(timeoutId); } catch {}
      setLyricsLoading(false);
    }
  }

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
                {nowPlaying.isKaraoke ? (
                  <FaMicrophoneLines className="text-5xl text-accent opacity-80 animate-pulse" />
                ) : (
                  <FaCirclePlay className="text-5xl text-accent opacity-80 animate-pulse" />
                )}
              </div>
              <div className="flex-grow z-10">
                <span className="inline-flex items-center gap-2 text-accent text-sm font-semibold uppercase">
                  <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
                  Reproduciendo
                </span>
                <p className="mt-1 text-2xl font-bold text-white">
                  {nowPlaying.songTitle}
                </p>
                <p className="text-base font-medium text-gray-400">
                  {nowPlaying.artist}
                </p>
                <div className="flex items-center mt-3">
                  {nowPlaying.isKaraoke && (
                    <button
                      className="flex items-center gap-2 text-accent underline underline-offset-2 hover:text-accent-hover transition bg-transparent border-none p-0 shadow-none cursor-pointer relative z-20"
                      style={{ appearance: "none" }}
                      onClick={() =>
                        handleShowLyrics(
                          nowPlaying.songTitle,
                          nowPlaying.artist
                        )
                      }
                      aria-label="Ver letra de la canción"
                    >
                      <FaBookOpen className="inline-block" />
                      Ver Letra
                    </button>
                  )}
                  <div className="flex-1" />
                  <div className="flex items-center gap-1 text-xl font-bold text-gray-400 hover:text-accent transition-colors duration-300 z-10 cursor-pointer">
                    <FaThumbsUp />
                    <span>{nowPlaying.votes}</span>
                  </div>
                </div>
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

        <LyricsModal
          open={lyricsOpen}
          onClose={() => setLyricsOpen(false)}
          songTitle={nowPlaying?.songTitle}
          artist={nowPlaying?.artist}
          lyrics={lyrics}
          lyricsLoading={lyricsLoading}
          lyricsError={lyricsError}
        />
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
