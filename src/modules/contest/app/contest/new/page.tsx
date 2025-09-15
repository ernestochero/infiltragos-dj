import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@core/api/auth';
import ContestCreateForm from '@/modules/contest/components/ContestCreateForm';
import Breadcrumbs from '@survey/components/nav/Breadcrumbs';

export default function ContestNewPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session || session.role !== 'ADMIN') {
    return <main className="p-4">Debe iniciar sesión como ADMIN.</main>;
  }
  return (
    <main className="mx-auto w-full max-w-[1400px] px-3 md:px-4 lg:px-6 py-5 space-y-6">
      <Breadcrumbs items={[{ label: 'Inicio', href: '/admin' }, { label: 'Contests', href: '/contest' }, { label: 'Nueva' }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo contest</h1>
      </div>
      <ContestCreateForm />
    </main>
  );
}
