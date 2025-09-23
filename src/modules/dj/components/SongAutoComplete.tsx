"use client";

import { useEffect, useRef, useState } from "react";
import { TrackSuggestion } from "@dj/types/spotify";
import { FaMusic } from "react-icons/fa";

interface Props {
  value: string;
  disabled?: boolean;
  onValueChange: (v: string) => void;
  onArtistChange: (v: string) => void;
  onTrackSelect: (track: TrackSuggestion | null) => void;
  maxLengthSongTitle: number;
}

export default function SongAutoComplete({
  value,
  disabled,
  onValueChange,
  onArtistChange,
  onTrackSelect,
  maxLengthSongTitle,
}: Props) {
  const [suggestions, setSuggestions] = useState<TrackSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [highlight, setHighlight] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const suppressNextFetchRef = useRef(false);

  useEffect(() => {
    // Skip one fetch cycle right after selecting a suggestion (we set the input to the selected track name)
    if (suppressNextFetchRef.current) {
      suppressNextFetchRef.current = false;
      setOpen(false);
      setSuggestions([]);
      return;
    }
    if (value.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(value)}`,
          {
            signal: controller.signal,
          }
        );
        if (res.status === 429) {
          setError("Demasiadas búsquedas, intenta en unos segundos");
          setSuggestions([]);
        } else if (res.ok) {
          const data = (await res.json()) as { tracks: TrackSuggestion[] };
          setSuggestions(data.tracks);
          setOpen(true);
          setHighlight(0);
        }
      } catch {
        setError("Error de red o del servidor.");
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  function select(track: TrackSuggestion) {
    suppressNextFetchRef.current = true;
    onValueChange(track.name);
    onArtistChange(track.artist);
    onTrackSelect(track);
    setSuggestions([]);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const track = suggestions[highlight];
      if (track) select(track);
    }
  }

  function handleBlur() {
    setTimeout(() => setOpen(false), 100);
  }

  return (
    <div className="relative w-full">
      <FaMusic className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        id="song_title"
        name="song_title"
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          onTrackSelect(null);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={handleBlur}
        placeholder="Ej. Blinding Lights"
        className="w-full rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-400 pl-10 pr-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent"
        maxLength={maxLengthSongTitle}
        disabled={disabled}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 shadow-lg max-h-60 overflow-auto">
          {loading && <li className="p-2 text-sm text-slate-400">Buscando…</li>}
          {!loading && error && (
            <li className="p-2 text-sm text-rose-300">{error}</li>
          )}
          {!loading &&
            !error &&
            suggestions.map((s, i) => (
              <li
                key={s.id}
                className={`p-2 cursor-pointer ${
                  i === highlight ? "bg-slate-700" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(s);
                }}
              >
                <span className="font-medium">{s.name}</span>{" "}
                <span className="text-slate-400 text-sm">{s.artist}</span>
              </li>
            ))}
          {!loading && !error && suggestions.length === 0 && (
            <li className="p-2 text-sm text-slate-400">Sin resultados</li>
          )}
        </ul>
      )}
    </div>
  );
}
