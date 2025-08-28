import Card from '@survey/components/ui/card';
import PublicSurveyForm from '@survey/components/PublicSurveyForm';
import prisma from '@core/prisma';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Question } from '@survey/lib/validation';
import { sha256Hex } from '@raffle/lib/utils';

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

  // If this survey has an active raffle, and we're in production, check if the device already participated
  let alreadyParticipated = false;
  if (raffle?.isActive && process.env.NODE_ENV === 'production') {
    const hdrs = headers();
    const ip = hdrs.get('x-forwarded-for')?.split(',')[0] ?? '0.0.0.0';
    const ua = hdrs.get('user-agent') || '';
    const ipHash = sha256Hex(`${ip}|${ua}`);
    const entry = await prisma.raffleEntry.findFirst({ where: { raffleId: raffle.id, ipHash } });
    alreadyParticipated = !!entry;
  }
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
      {raffle && raffle.isActive && alreadyParticipated ? (
        <Card>
          <div className="p-6 text-center">
            <p className="text-lg font-semibold">¡Gracias por participar!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ya registramos tu participación en este sorteo.
            </p>
            <div className="mt-4">
              <a
                href={`/raffles/${raffle.id}`}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                Ver participantes
              </a>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <PublicSurveyForm survey={survey} raffleId={raffle && raffle.isActive ? raffle.id : undefined} />
        </Card>
      )}
    </div>
  );
}
