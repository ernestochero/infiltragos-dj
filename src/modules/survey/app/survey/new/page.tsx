import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SurveyForm from '@survey/components/SurveyForm';
import { Card } from '@survey/components/ui';
import Breadcrumbs from '@survey/components/nav/Breadcrumbs';

export default function NewSurveyPage() {
  const cookie = cookies().get('dj_admin');
  if (cookie?.value !== '1') {
    redirect('/dj/login');
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Surveys', href: '/survey' }, { label: 'Nueva' }]} />
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
    </div>
  );
}
