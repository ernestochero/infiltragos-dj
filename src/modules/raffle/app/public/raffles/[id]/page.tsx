import prisma from '@core/prisma';
import ParticipantsList from '@raffle/components/ParticipantsList';
import RafflePublicClient from '@raffle/components/RafflePublicClient';
import { headers } from 'next/headers';
import type { Question } from '@survey/lib/validation';
import { sha256Hex } from '@raffle/lib/utils';

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

  // Server-side check whether this device already participated (prod only)
  let alreadyParticipated = false;
  if (raffle.isActive && process.env.NODE_ENV === 'production') {
    const hdrs = headers();
    const ip = hdrs.get('x-forwarded-for')?.split(',')[0] ?? '0.0.0.0';
    const ua = hdrs.get('user-agent') || '';
    const ipHash = sha256Hex(`${ip}|${ua}`);
    const entry = await prisma.raffleEntry.findFirst({ where: { raffleId: raffle.id, ipHash } });
    alreadyParticipated = !!entry;
  }

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

      {raffle.isActive && (
        <div className="mb-6 flex justify-center">
          <RafflePublicClient
            raffleId={raffle.id}
            canParticipate={!alreadyParticipated}
            survey={{
              id: raffle.survey.id,
              name: raffle.survey.name,
              description: raffle.survey.description,
              questions,
            }}
          />
        </div>
      )}

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
