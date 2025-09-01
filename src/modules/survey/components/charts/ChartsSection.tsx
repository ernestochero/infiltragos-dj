import QuestionChart from './QuestionChart';
import prisma from '@core/prisma';
import { buildSurveyAnalytics } from '@survey/lib/analytics';
import type { SurveyAnalytics } from '@survey/types/analytics';
import type { Question } from '@survey/lib/validation';

interface Props {
  slug: string;
}

export default async function ChartsSection({ slug }: Props) {
  const survey = await prisma.survey.findUnique({
    where: { slug },
    include: { questions: true },
  });
  if (!survey) return null;
  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: survey.id },
  });
  const analytics: SurveyAnalytics = buildSurveyAnalytics(
    survey.questions as unknown as Question[],
    responses.map(r => ({ answers: r.answers as Record<string, unknown> })),
  );

  return (
    <section className="mt-4 space-y-4">
      <h2 className="text-lg font-medium text-slate-100">Gráficos</h2>
      {analytics.map(q => (
        <div key={q.id} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
          <h3 className="mb-2 text-sm font-medium text-slate-100">{q.label}</h3>
          <QuestionChart data={q} />
        </div>
      ))}
    </section>
  );
}
