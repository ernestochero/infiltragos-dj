import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SurveyForm from '@survey/components/SurveyForm';

export default function NewSurveyPage() {
  const cookie = cookies().get('dj_admin');
  if (cookie?.value !== '1') {
    redirect('/dj/login');
  }
  return (
    <main className="p-4">
      <h1 className="text-xl mb-4">Nueva encuesta</h1>
      <SurveyForm />
    </main>
  );
}
