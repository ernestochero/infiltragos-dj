import Card from '@survey/components/ui/card';
import PublicSurveyForm from '@survey/components/PublicSurveyForm';
import prisma from '@core/prisma';
import { notFound } from 'next/navigation';
import type { Question } from '@survey/lib/validation';

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
  return (
    <div className="mx-auto max-w-2xl p-4">
      <Card>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">{survey.name}</h1>
        {survey.description && <p className="mb-6 text-sm text-muted-foreground">{survey.description}</p>}
        <PublicSurveyForm survey={survey} />
      </Card>
    </div>
  );
}
