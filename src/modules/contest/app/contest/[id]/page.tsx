import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@core/api/auth';
import ContestDetailClient from '@/modules/contest/components/ContestDetailClient';
import prisma from '@core/prisma';
import Breadcrumbs from '@survey/components/nav/Breadcrumbs';

export default async function ContestDetailPage({ params }: { params: { id: string } }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session || session.role !== 'ADMIN') {
    return <main className="p-4">Debe iniciar sesión como ADMIN.</main>;
  }
  const contest = await prisma.contest.findUnique({
    where: { id: params.id },
    include: { contestants: { orderBy: { name: 'asc' } }, polls: { orderBy: [{ round: 'asc' }, { startAt: 'asc' }], include: { contestants: true } } },
  });
  if (!contest) return <main className="p-4">Contest no encontrado</main>;

  return (
    <main className="mx-auto w-full max-w-[1400px] px-3 md:px-4 lg:px-6 py-5 space-y-6">
      <Breadcrumbs items={[{ label: 'Inicio', href: '/admin' }, { label: 'Contests', href: '/contest' }, { label: contest.title }]} />
      <h1 className="text-2xl font-semibold tracking-tight">{contest.title}</h1>
      <ContestDetailClient
        contestId={contest.id}
        contestants={contest.contestants.map(c => ({ id: c.id, name: c.name, slug: c.slug }))}
        polls={contest.polls.map(p => ({
          id: p.id,
          title: p.title,
          round: p.round,
          startAt: p.startAt.toISOString(),
          endAt: p.endAt.toISOString(),
          nextPollId: p.nextPollId,
          nextSlot: p.nextSlot,
          contestants: p.contestants.map(pc => ({ id: pc.id, contestantId: pc.contestantId })),
        }))}
      />
    </main>
  );
}
