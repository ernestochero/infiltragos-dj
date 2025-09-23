"use client";
import { Dialog } from "@headlessui/react";
import React, { useEffect, useState, useRef } from "react";
import { FaMusic, FaChair, FaUser, FaTimes } from "react-icons/fa";
import { z } from "zod";
import SongAutoComplete from "@/modules/dj/components/SongAutoComplete";
import { TrackSuggestion } from "@dj/types/spotify";

const MAX_SONG_TITLE_LENGTH = 100;
const MAX_ARTIST_LENGTH = 100;
const MAX_TABLE_OR_NAME_LENGTH = 50;

const schema = z.object({
  song_title: z
    .string()
    .min(1, "La canción es obligatoria")
    .max(MAX_SONG_TITLE_LENGTH, "Máx. 50 caracteres"),
  artist: z
    .string()
    .min(1, "El artista es obligatorio")
    .max(MAX_ARTIST_LENGTH, "Máx. 50 caracteres"),
  table_or_name: z
    .string()
    .max(MAX_TABLE_OR_NAME_LENGTH, "Máx. 20 caracteres")
    .optional()
    .or(z.literal("")),
  track_id: z.string().optional(),
  track_uri: z.string().optional(),
});

type FormDataShape = z.infer<typeof schema>;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  titleId?: string;
  title?: string;
  onSuccess: () => void;
}
export default function ModalRequestForm({
  open,
  onClose,
  titleId = "request-form-title",
  title = "Nuevo pedido",
  onSuccess,
}: ModalProps) {
  const [values, setValues] = useState<FormDataShape>({
    song_title: "",
    artist: "",
    table_or_name: "",
  });
  const [state, setState] = useState<"idle" | "submitting">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string>("");

  function onChange<K extends keyof FormDataShape>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError("");
    setErrors({});
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as string;
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setState("submitting");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        let message =
          "Hubo un problema al enviar tu pedido. Intenta nuevamente.";
        if (res.status === 429) {
          const data = (await res.json().catch(() => null)) as {
            retry_after_seconds?: number;
          } | null;
          if (data && typeof data.retry_after_seconds === "number") {
            message = `Solo puedes pedir una canción cada 2 minutos. Intenta de nuevo en ${data.retry_after_seconds} segundos.`;
          } else {
            message =
              "Solo puedes pedir una canción cada 2 minutos. Intenta de nuevo más tarde.";
          }
        }
        setGlobalError(message);
        setState("idle");
        return;
      }
      setValues({ song_title: "", artist: "", table_or_name: "" });
      onSuccess();
      setState("idle");
    } catch {
      setGlobalError(
        "Hubo un problema al enviar tu pedido. Intenta nuevamente."
      );
      setState("idle");
    }
  }

  const disabled = state === "submitting";
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const box = boxRef.current;
    const focusSelectors =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const songInput = box?.querySelector<HTMLInputElement>("#song_title");
    if (songInput) {
      songInput.focus();
    } else {
      const firstFocusable = box?.querySelector<HTMLElement>(focusSelectors);
      firstFocusable?.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && box) {
        const focusables = Array.from(
          box.querySelectorAll<HTMLElement>(focusSelectors)
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-modal="true"
      aria-labelledby={titleId}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
        <div
          ref={boxRef}
          className="bg-card-bg p-8 m-3 rounded-2xl shadow-2xl max-w-sm w-full relative"
        >
          <h2
            id={titleId}
            className="text-2xl font-extrabold tracking-tight text-white flex justify-center items-center gap-2"
          >
            {title} <FaMusic className="text-accent" />
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-white rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-accent transition"
            tabIndex={0}
          >
            <FaTimes className="h-4 w-4" />
          </button>
          <p className="mt-1 text-gray-400 text-sm text-center">
            Escribe el nombre de tu canción y te ayudamos con la búsqueda.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {globalError && (
              <p
                role="alert"
                className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
              >
                {globalError}
              </p>
            )}

            <div>
              <label
                htmlFor="song_title"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Canción
              </label>
              <div className="relative">
                <SongAutoComplete
                  value={values.song_title}
                  onValueChange={(v) => onChange("song_title", v)}
                  onArtistChange={(v) => onChange("artist", v)}
                  onTrackSelect={(t: TrackSuggestion | null) =>
                    setValues((prev) => ({
                      ...prev,
                      track_id: t?.id,
                      track_uri: t?.uri,
                    }))
                  }
                  disabled={disabled}
                  maxLengthSongTitle={MAX_SONG_TITLE_LENGTH}
                />
              </div>
              {errors.song_title && (
                <p className="mt-1 text-xs text-rose-300">
                  {errors.song_title}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="artist"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Artista
              </label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="artist"
                  name="artist"
                  value={values.artist}
                  onChange={(e) => onChange("artist", e.target.value)}
                  placeholder="Ej. The Weeknd"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-400 pl-10 pr-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent"
                  maxLength={MAX_ARTIST_LENGTH}
                  disabled={disabled}
                  autoComplete="off"
                />
              </div>
              {errors.artist && (
                <p className="mt-1 text-xs text-rose-300">{errors.artist}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="table_or_name"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Mesa o nombre <span className="text-gray-400">(opcional)</span>
              </label>
              <div className="relative">
                <FaChair className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="table_or_name"
                  name="table_or_name"
                  value={values.table_or_name}
                  onChange={(e) => onChange("table_or_name", e.target.value)}
                  placeholder="Ej. Mesa 2 o Box 4"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-400 pl-10 pr-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent"
                  maxLength={MAX_TABLE_OR_NAME_LENGTH}
                  disabled={disabled}
                  autoComplete="off"
                />
              </div>
              {errors.table_or_name && (
                <p className="mt-1 text-xs text-rose-300">
                  {errors.table_or_name}
                </p>
              )}
            </div>

            <button
              className="w-full bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent-hover text-dark-bg px-4 py-2.5 rounded-full font-bold transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:scale-105"
              disabled={disabled}
              type="submit"
            >
              {state === "submitting" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Enviando…
                </span>
              ) : (
                "Pedir"
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Podrás ver tu pedido en la cola una vez que sea aprobado.
            </p>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
