'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type SurveyItem = {
  id: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
  updatedAt: string;
  _count: { responses: number };
};

function StatusBadge({ status }: { status: SurveyItem['status'] }) {
  const styles: Record<string, string> = {
    DRAFT:
      'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
    PUBLISHED:
      'bg-green-100 text-green-800 ring-1 ring-green-200',
    ARCHIVED:
      'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'}`}>
      {status}
    </span>
  );
}

export default function SurveyIndex() {
  const [list, setList] = useState<SurveyItem[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }, [search, status, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleClear = () => {
    setSearch('');
    setStatus('');
    setFrom('');
    setTo('');
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas archivar esta encuesta?')) return;
    await fetch(`/api/surveys/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const copyLink = async (slug: string, id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/survey/${slug}`);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <form onSubmit={handleSearch} className="grid w-full grid-cols-1 gap-3 sm:grid-cols-5">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-300">Buscar</label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd"/></svg>
                <input
                  className="w-full rounded-md border border-white/10 bg-black/30 px-8 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre o slug"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-300">Estado</label>
              <select
                className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-300">Desde</label>
              <input
                type="date"
                className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-300">Hasta</label>
              <input
                type="date"
                className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="col-span-1 flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none"
              >
                Filtrar
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center justify-center rounded-md border border-white/10 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/10"
              >
                Limpiar
              </button>
            </div>
          </form>

          <Link
            href="/survey/new"
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500"
          >
            Nueva encuesta
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-white/10 shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-gray-300">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Actualizado</th>
                <th className="px-4 py-3">Respuestas</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-black/20">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Cargando encuestas…
                  </td>
                </tr>
              )}
              {!loading && list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    No hay encuestas con los filtros aplicados.
                    <div className="mt-3">
                      <Link href="/survey/new" className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500">Crear la primera</Link>
                    </div>
                  </td>
                </tr>
              )}
              {list.map((it) => (
                <tr key={it.id} className="hover:bg-white/5">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-100">{it.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-300">{it.slug}</td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={it.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-300">{new Date(it.updatedAt).toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-300">{it._count.responses}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/survey/${it.id}/edit`} className="rounded-md border border-white/10 px-2 py-1 text-xs text-blue-300 hover:bg-white/10">Editar</Link>
                      <Link href={`/survey/${it.id}/results`} className="rounded-md border border-white/10 px-2 py-1 text-xs text-blue-300 hover:bg-white/10">Resultados</Link>
                      <button
                        onClick={() => copyLink(it.slug, it.id)}
                        className="rounded-md border border-white/10 px-2 py-1 text-xs text-indigo-300 hover:bg-white/10"
                      >
                        {copiedId === it.id ? '¡Copiado!' : 'Copiar enlace'}
                      </button>
                      <button
                        onClick={() => handleDelete(it.id)}
                        className="rounded-md border border-white/10 px-2 py-1 text-xs text-red-300 hover:bg-white/10"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
