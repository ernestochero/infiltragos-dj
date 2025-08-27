import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import prisma from '@core/prisma';

interface Props {
  params: { id: string };
}

export default async function SurveyResultsPage({ params }: Props) {
  const cookie = cookies().get('dj_admin');
  if (cookie?.value !== '1') {
    redirect('/dj/login');
  }
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
  const recent = responses.filter(r => r.createdAt >= new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
  return (
    <main className="p-4">
      <h1 className="text-xl mb-4">Resultados: {survey.name}</h1>
      <div className="flex gap-4 mb-4">
        <div>Total respuestas: {total}</div>
        <div>Últimas 24h: {recent}</div>
        <div>Estado: {survey.status}</div>
      </div>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Fecha</th>
            {survey.questions.map(q => (
              <th key={q.id} className="p-2 text-left">{q.label}</th>
            ))}
            <th className="p-2 text-left">Ver</th>
          </tr>
        </thead>
        <tbody>
          {responses.map(r => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.createdAt.toISOString()}</td>
              {survey.questions.map(q => {
                const ans = (r.answers as Record<string, unknown>)[q.id ?? `q${q.order}`];
                return (
                  <td key={q.id} className="p-2">
                    {Array.isArray(ans) ? (ans as unknown[]).join(', ') : String(ans ?? '')}
                  </td>
                );
              })}
              <td className="p-2">
                <details>
                  <summary>ver</summary>
                  <pre className="whitespace-pre-wrap">{JSON.stringify(r.answers, null, 2)}</pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4">TODO: Charts</div>
    </main>
  );
}
