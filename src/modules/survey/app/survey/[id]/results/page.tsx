import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@core/api/auth';
import prisma from '@core/prisma';
import Breadcrumbs from '@survey/components/nav/Breadcrumbs';
import SurveyTabs from '@survey/components/nav/SurveyTabs';
import Link from 'next/link';

interface Props {
  params: { id: string };
}

function formatDate(d: Date) {
  try {
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-700/30 px-2 py-0.5 text-xs text-slate-200 ring-1 ring-inset ring-slate-600/30">
      {children}
    </span>
  );
}

export default async function SurveyResultsPage({ params }: Props) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session || session.role !== 'ADMIN') redirect('/login');

  const survey = await prisma.survey.findUnique({
    where: { id: params.id },
    include: { questions: true },
  });
  if (!survey) notFound();

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: survey.id },
    orderBy: { createdAt: 'desc' },
  });

  const total = responses.length;
  const recent = responses.filter(
    (r) => r.createdAt >= new Date(Date.now() - 24 * 60 * 60 * 1000),
  ).length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/admin' },
            { label: 'Surveys', href: '/survey' },
            { label: survey.name || survey.id },
            { label: 'Resultados' },
          ]}
        />
        <SurveyTabs id={survey.id} />
        <Link href="/survey" className="text-sm text-indigo-300 hover:text-indigo-200">
          ← Volver
        </Link>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Resultados · <span className="text-indigo-300">{survey.name}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Resumen de respuestas y desglose por pregunta.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total respuestas</p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">{total}</p>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Últimas 24 horas</p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">{recent}</p>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Estado</p>
          <p className="mt-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/15 px-2.5 py-1 text-sm font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              {survey.status}
            </span>
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-800/60 text-slate-300 backdrop-blur">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-800/60 p-2">Fecha</th>
                {survey.questions.map((q) => (
                  <th key={q.id} className="p-2">{q.label}</th>
                ))}
                <th className="p-2">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {responses.map((r, idx) => (
                <tr
                  key={r.id}
                  className={idx % 2 === 0 ? 'bg-slate-900/20' : 'bg-slate-900/10 hover:bg-slate-900/20'}
                >
                  <td className="sticky left-0 z-10 bg-inherit p-2 text-slate-200">
                    {formatDate(r.createdAt)}
                  </td>
                  {survey.questions.map((q) => {
                    const key = q.id ?? `q${q.order}`;
                    const raw = (r.answers as Record<string, unknown>)[key];
                    if (Array.isArray(raw)) {
                      return (
                        <td key={q.id} className="p-2 text-slate-200">
                          <div className="flex flex-wrap gap-1">
                            {(raw as unknown[]).map((v, i) => (
                              <Chip key={String(v) + i}>{String(v)}</Chip>
                            ))}
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={q.id} className="p-2 text-slate-200">
                        {raw === null || raw === undefined || raw === '' ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          String(raw)
                        )}
                      </td>
                    );
                  })}

                  <td className="p-2">
                    <details className="group">
                      <summary className="cursor-pointer list-none text-indigo-300 hover:text-indigo-200">
                        Ver JSON
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-800/70 p-3 text-xs text-indigo-100 ring-1 ring-inset ring-slate-700/60">
                        {JSON.stringify(r.answers, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="mt-4 rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
        <h2 className="mb-2 text-lg font-medium text-slate-100">Gráficos</h2>
        <p className="text-sm text-slate-400">Próximamente: distribución de respuestas por pregunta.</p>
      </section>
    </div>
  );
}
