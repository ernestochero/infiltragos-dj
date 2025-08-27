'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type SurveyItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  updatedAt: string;
  _count: { responses: number };
};

export default function SurveyIndex() {
  const [list, setList] = useState<SurveyItem[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const res = await fetch(`/api/surveys?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setList(data.items);
    }
  }, [search, status, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Archivar encuesta?')) return;
    await fetch(`/api/surveys/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input className="border px-2 py-1" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar" />
          <select className="border px-2 py-1" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <input type="date" className="border px-2 py-1" value={from} onChange={e => setFrom(e.target.value)} />
          <input type="date" className="border px-2 py-1" value={to} onChange={e => setTo(e.target.value)} />
          <button type="submit" className="px-3 py-1 border">Filtrar</button>
        </form>
        <Link href="/survey/new" className="px-3 py-1 border bg-green-500 text-white">Nueva encuesta</Link>
      </div>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Nombre</th>
            <th className="p-2 text-left">Slug</th>
            <th className="p-2 text-left">Estado</th>
            <th className="p-2 text-left">Actualizado</th>
            <th className="p-2 text-left">Respuestas</th>
            <th className="p-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {list.map(it => (
            <tr key={it.id} className="border-t">
              <td className="p-2">{it.name}</td>
              <td className="p-2">{it.slug}</td>
              <td className="p-2">{it.status}</td>
              <td className="p-2">{new Date(it.updatedAt).toLocaleString()}</td>
              <td className="p-2">{it._count.responses}</td>
              <td className="p-2 flex gap-2">
                <Link href={`/survey/${it.id}/edit`} className="text-blue-500 underline">Editar</Link>
                <Link href={`/survey/${it.id}/results`} className="text-blue-500 underline">Resultados</Link>
                <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/survey/${it.slug}`)} className="text-blue-500 underline">Copiar enlace</button>
                <button onClick={() => handleDelete(it.id)} className="text-red-500 underline">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
