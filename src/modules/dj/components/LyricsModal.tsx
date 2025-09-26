import { FaTimes } from "react-icons/fa";

interface LyricsModalProps {
  open: boolean;
  onClose: () => void;
  songTitle?: string;
  lyrics: string | null;
  lyricsLoading: boolean;
  lyricsError: string | null;
  artist?: string;
}

export default function LyricsModal({
  open,
  onClose,
  songTitle,
  lyrics,
  lyricsLoading,
  lyricsError,
  artist,
}: LyricsModalProps) {
  function getMusixmatchUrl(songTitle: string, artist: string) {
    const artista = encodeURIComponent(
      artist.trim().replace(/\s+/g, "-").replace(/[.']/g, "")
    );
    const cancion = encodeURIComponent(
      songTitle.trim().replace(/\s+/g, "-").replace(/[.']/g, "")
    );
    return `https://www.musixmatch.com/es/letras/${artista}/${cancion}`;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-card-bg rounded-xl p-6 max-w-lg w-full relative shadow-2xl">
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-accent transition"
          tabIndex={0}
        >
          <FaTimes className="h-4 w-4" />
        </button>
        <h3 className="text-xl font-bold mb-2 text-accent pr-10 truncate">
          Letra de {songTitle ?? "la canción"}
        </h3>
        {lyricsLoading && <p className="text-gray-400">Cargando letra…</p>}
        {lyricsError && (
          <div>
            <p className="text-rose-400">{lyricsError}</p>
            {songTitle && artist && (
              <>
                <a
                  href={getMusixmatchUrl(songTitle, artist)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  Ver letra en Musixmatch
                </a>
                <br />
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(
                    `${songTitle} ${artist} letra`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  Buscar letra en Google
                </a>
              </>
            )}
          </div>
        )}
        {lyrics && (
          <pre className="whitespace-pre-wrap text-white text-sm max-h-96 overflow-y-auto">
            {lyrics}
          </pre>
        )}
      </div>
    </div>
  );
}
