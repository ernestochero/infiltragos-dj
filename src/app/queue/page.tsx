'use client';
import useSWR from 'swr';

interface Request {
  id: string;
  songTitle: string;
  artist: string;
  votes: number;
  status: string;
  tableOrName?: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function QueuePage() {
  const { data } = useSWR<Request[]>('/api/requests', fetcher, { refreshInterval: 10000 });
  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Queue</h1>
      <ul className="space-y-2">
        {data?.map(r => (
          <li key={r.id} className="border p-2 rounded flex justify-between">
            <span>{r.songTitle} - {r.artist}</span>
            <span className="text-sm">{r.votes} votos</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
