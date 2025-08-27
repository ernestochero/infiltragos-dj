import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import SurveyForm from '@survey/components/SurveyForm';
import SurveyStatusControls from '@survey/components/SurveyStatusControls';
import prisma from '@core/prisma';
import type { Question } from '@survey/lib/validation';

interface Props {
  params: { id: string };
}

export default async function EditSurveyPage({ params }: Props) {
  const cookie = cookies().get('dj_admin');
  if (cookie?.value !== '1') {
    redirect('/dj/login');
  }
  const survey = await prisma.survey.findUnique({
    where: { id: params.id },
    include: { questions: true },
  });
  if (!survey) notFound();
  return (
    <main className="p-4">
      <h1 className="text-xl mb-4">Editar encuesta</h1>
      <SurveyForm
        initial={{
          id: survey.id,
          name: survey.name,
          slug: survey.slug,
          description: survey.description,
          status: survey.status,
          effectiveFrom: survey.effectiveFrom?.toISOString() ?? null,
          questions: survey.questions.map(q => ({
            id: q.id,
            type: q.type,
            label: q.label,
            required: q.required,
            order: q.order,
            helpText: q.helpText ?? undefined,
            options: (q.options as unknown as { label: string; value: string; order: number; id?: string }[]) || undefined,
          })) as Question[],
        }}
      />
      <SurveyStatusControls id={survey.id} current={survey.status} />
    </main>
  );
}
