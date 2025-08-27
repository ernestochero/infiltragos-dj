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

      <section className="rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.03] p-4 md:p-6 lg:p-8 shadow-lg
  [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight
  [&_label]:text-sm [&_label]:font-medium [&_label]:text-foreground
  [&_small]:text-xs [&_small]:text-muted-foreground
  [&_fieldset]:space-y-3 [&_fieldset]:border [&_fieldset]:border-white/10 [&_fieldset]:rounded-lg [&_fieldset]:p-4
  [&_legend]:px-1 [&_legend]:text-xs [&_legend]:uppercase [&_legend]:tracking-wider [&_legend]:text-muted-foreground
  [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-white/10 [&_input]:bg-black/20 [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:text-foreground [&_input]:placeholder:text-muted-foreground [&_input]:shadow-inner focus:[&_input]:outline-none focus:[&_input]:ring-2 focus:[&_input]:ring-primary/50 focus:[&_input]:border-primary/60 disabled:[&_input]:opacity-50
  [&_textarea]:w-full [&_textarea]:rounded-md [&_textarea]:border [&_textarea]:border-white/10 [&_textarea]:bg-black/20 [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:text-foreground [&_textarea]:placeholder:text-muted-foreground [&_textarea]:shadow-inner focus:[&_textarea]:outline-none focus:[&_textarea]:ring-2 focus:[&_textarea]:ring-primary/50 focus:[&_textarea]:border-primary/60 disabled:[&_textarea]:opacity-50
  [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-white/10 [&_select]:bg-black/20 [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-foreground [&_select]:shadow-inner focus:[&_select]:outline-none focus:[&_select]:ring-2 focus:[&_select]:ring-primary/50 focus:[&_select]:border-primary/60 disabled:[&_select]:opacity-50
  [&_input[type='checkbox']]:h-4 [&_input[type='checkbox']]:w-4 [&_input[type='checkbox']]:rounded [&_input[type='checkbox']]:border-white/20
  [&_hr]:border-white/10
  [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center [&_button]:rounded-md [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:font-medium [&_button]:transition-colors
  [&_button.primary]:bg-primary [&_button.primary]:text-primary-foreground hover:[&_button.primary]:bg-primary/90
  [&_button.muted]:bg-white/10 [&_button.muted]:text-foreground hover:[&_button.muted]:bg-white/15">
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
      </section>
    </main>
  );
}
