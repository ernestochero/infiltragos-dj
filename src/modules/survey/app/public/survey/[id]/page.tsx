import Card from '@survey/components/ui/card';
import PublicSurveyForm from '@survey/components/PublicSurveyForm';
import prisma from '@core/prisma';
import { notFound } from 'next/navigation';
import type { Question } from '@survey/lib/validation';

export default async function SurveyPublicPage({ params }: { params: { id: string } }) {
  const survey = (await prisma.survey.findUnique({
    where: { slug: params.id },
    include: { questions: { orderBy: { order: 'asc' } } },
  })) as ({
    id: string;
    name: string;
    description: string | null;
    status: string;
    questions: Question[];
  }) | null;
  if (!survey || survey.status !== 'PUBLISHED') notFound();
  const raffle = await prisma.raffle.findUnique({ where: { surveyId: survey.id } });
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      {/* Encabezado estilo Google Forms */}
      <div className="mb-6 rounded-xl border bg-gradient-to-b from-muted/30 to-transparent p-6 text-center sm:mb-8 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{survey.name}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {survey.description ?? 'Responde estas rápidas preguntas y ayúdanos a mejorar tu experiencia. ¡Gracias!'}
        </p>
      </div>

      {/* Contenedor del formulario */}
      <Card>
        <PublicSurveyForm survey={survey} raffleId={raffle && raffle.isActive ? raffle.id : undefined} />
      </Card>
    </div>
  );
}
