'use client';
import { useRouter } from 'next/navigation';

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
    <div className="flex gap-2 mt-4">
      {current !== 'PUBLISHED' && (
        <button type="button" className="px-2 py-1 border" onClick={() => change('PUBLISHED')}>
          Publicar
        </button>
      )}
      {current === 'PUBLISHED' && (
        <button type="button" className="px-2 py-1 border" onClick={() => change('DRAFT')}>
          Despublicar
        </button>
      )}
      {current !== 'ARCHIVED' && (
        <button type="button" className="px-2 py-1 border" onClick={() => change('ARCHIVED')}>
          Archivar
        </button>
      )}
    </div>
  );
}
