import prisma from '@core/prisma';
import ParticipantsList from '@raffle/components/ParticipantsList';
import type { Question } from '@survey/lib/validation';

export default async function RafflePublicPage({ params }: { params: { id: string } }) {
  const raffle = await prisma.raffle.findUnique({
    where: { id: params.id },
    include: { survey: { include: { questions: { orderBy: { order: 'asc' } } } } },
  });
  if (!raffle) return null;

  const questions = (raffle.survey?.questions ?? []) as unknown as Question[];
  const columns = (raffle.publicDisplayQuestionIds ?? []).map((qid: string) => {
    const q = questions.find(qq => qq.id === qid);
    return { id: qid, label: q?.label ?? qid };
  });

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6 rounded-xl border bg-gradient-to-b from-muted/30 to-transparent p-6 text-center sm:mb-8 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {raffle.survey?.name || 'Sorteo'}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Lista de participantes
        </p>
      </div>

      {raffle.publicParticipants ? (
        <ParticipantsList raffleId={raffle.id} columns={columns} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Este sorteo no expone públicamente la lista de participantes.
        </p>
      )}
    </div>
  );
}
