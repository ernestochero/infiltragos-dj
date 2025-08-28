import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import SurveyForm from '@survey/components/SurveyForm';
import SurveyStatusControls from '@survey/components/SurveyStatusControls';
import prisma from '@core/prisma';
import type { Question } from '@survey/lib/validation';
import { Card } from '@survey/components/ui';

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
    <main className="mx-auto w-full max-w-[1400px] px-3 md:px-4 lg:px-6 py-5 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Editar encuesta</h1>
          <p className="text-sm text-muted-foreground">Modifica preguntas, metadatos y el estado de publicación.</p>
        </div>
        <div className="shrink-0">
          <SurveyStatusControls id={survey.id} current={survey.status} />
        </div>
      </header>

      <Card>
        <SurveyForm
          initial={{
            id: survey.id,
            name: survey.name,
            slug: survey.slug,
            description: survey.description,
            status: survey.status,
            effectiveFrom: survey.effectiveFrom?.toISOString() ?? null,
            questions: survey.questions.map((q) => ({
              id: q.id,
              type: q.type,
              label: q.label,
              required: q.required,
              order: q.order,
              helpText: q.helpText ?? undefined,
              options:
                (q.options as unknown as {
                  label: string;
                  value: string;
                  order: number;
                  id?: string;
                }[]) || undefined,
            })) as Question[],
          }}
        />
      </Card>
    </main>
  );
}
