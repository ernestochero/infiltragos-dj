import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SurveyForm from '@survey/components/SurveyForm';
import { Card } from '@survey/components/ui';

export default function NewSurveyPage() {
  const cookie = cookies().get('dj_admin');
  if (cookie?.value !== '1') {
    redirect('/dj/login');
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] px-3 md:px-4 lg:px-6 py-5 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Nueva encuesta</h1>
          <p className="text-sm text-muted-foreground">
            Define los metadatos y construye las preguntas. Podrás publicarla cuando esté lista.
          </p>
        </div>
      </header>

        <Card>
          <SurveyForm />
        </Card>
    </main>
  );
}
