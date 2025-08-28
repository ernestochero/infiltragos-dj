import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE } from '@core/api/auth';
import SurveyForm from '@survey/components/SurveyForm';
import { Card } from '@survey/components/ui';
import Breadcrumbs from '@survey/components/nav/Breadcrumbs';

export default function NewSurveyPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Inicio', href: '/admin' }, { label: 'Surveys', href: '/survey' }, { label: 'Nueva' }]} />
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
