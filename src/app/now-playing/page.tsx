"use client";
import useSWR from 'swr';

interface Request { id: string; songTitle: string; artist: string; }

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function NowPlaying() {
  const { data } = useSWR<Request | null>('/api/requests?status=PLAYING', fetcher, { refreshInterval: 5000 });
  if (!data) return <p className="p-4">No hay canción sonando</p>;
  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">{data.songTitle}</h1>
      <p className="text-2xl">{data.artist}</p>
    </main>
  );
}
