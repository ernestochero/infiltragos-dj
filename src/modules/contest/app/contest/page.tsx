'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Breadcrumbs from '@survey/components/nav/Breadcrumbs';

type ContestItem = {
  id: string;
  title: string;
  description?: string | null;
  updatedAt: string;
  _count: { contestants: number; polls: number };
};

export default function ContestAdminIndex() {
  const [list, setList] = useState<ContestItem[]>([]);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/admin/contests?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setList(data.items as ContestItem[]);
      }
    } finally {
      setLoading(false);
    }
  }, [search, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchData(); };
  const handleClear = () => { setSearch(''); setFrom(''); setTo(''); fetchData(); };

  return (
    <main className="mx-auto w-full max-w-[1400px] px-3 md:px-4 lg:px-6 py-5 space-y-6">
      <Breadcrumbs items={[{ label: 'Inicio', href: '/admin' }, { label: 'Contests' }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Concursos</h1>
        <div className="flex items-center gap-2">
          <Link href="/contest/new" className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Nuevo contest</Link>
          <Link href="/login" className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500">Logout</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-5">
        <form onSubmit={handleSearch} className="grid w-full grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-300">Buscar</label>
            <div className="relative">
              <svg className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd"/></svg>
              <input className="w-full rounded-md border border-white/10 bg-black/30 px-8 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-indigo-400 focus:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Título" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-300">Desde</label>
            <input type="date" className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-300">Hasta</label>
            <input type="date" className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="col-span-1 flex items-end gap-2">
            <button type="submit" className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none">Filtrar</button>
            <button type="button" onClick={handleClear} className="inline-flex items-center justify-center rounded-md border border-white/10 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/10">Limpiar</button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-white/10 shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-gray-300">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Actualizado</th>
                <th className="px-4 py-3">Participantes</th>
                <th className="px-4 py-3">Polls</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-black/20">
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Cargando contests…</td></tr>
              )}
              {!loading && list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    No hay concursos con los filtros aplicados.
                    <div className="mt-3"><Link href="/contest/new" className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500">Crear el primero</Link></div>
                  </td>
                </tr>
              )}
              {list.map((it) => (
                <tr key={it.id} className="hover:bg-white/5">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-100">{it.title}</td>
                  <td className="px-4 py-3 text-gray-300">{it.description || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-300">{new Date(it.updatedAt).toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-300">{it._count.contestants}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-300">{it._count.polls}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/contest/${it.id}`} className="rounded-md border border-white/10 px-2 py-1 text-xs text-blue-300 hover:bg-white/10">Abrir</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
