'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@survey/components/ui';

interface Props {
  id: string;
  current: string;
}

export default function SurveyStatusControls({ id, current }: Props) {
  const router = useRouter();
  const change = async (status: string) => {
    await fetch(`/api/surveys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  };
  return (
    <div className="mt-4 flex gap-2">
      {current !== 'PUBLISHED' && (
        <Button type="button" variant="muted" onClick={() => change('PUBLISHED')}>
          Publicar
        </Button>
      )}
      {current === 'PUBLISHED' && (
        <Button type="button" variant="muted" onClick={() => change('DRAFT')}>
          Despublicar
        </Button>
      )}
      {current !== 'ARCHIVED' && (
        <Button type="button" variant="muted" onClick={() => change('ARCHIVED')}>
          Archivar
        </Button>
      )}
    </div>
  );
}
