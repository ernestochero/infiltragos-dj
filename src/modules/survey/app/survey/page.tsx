import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SurveyIndex from '@survey/components/SurveyIndex';

export default function Page() {
  const cookie = cookies().get('dj_admin');
  if (cookie?.value !== '1') {
    redirect('/dj/login');
  }
  return (
    <main className="p-4">
      <h1 className="text-xl mb-4">Encuestas</h1>
      <SurveyIndex />
    </main>
  );
}
