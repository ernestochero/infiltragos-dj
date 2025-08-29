'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import Modal from '@dj/components/modal';
import PublicSurveyForm from '@survey/components/PublicSurveyForm';
import type { Question } from '@survey/lib/validation';

export default function RafflePublicClient({
  raffleId,
  canParticipate,
  survey,
  initialIsActive = true,
}: {
  raffleId: string;
  canParticipate: boolean;
  survey: { id: string; name: string; description?: string | null; questions: Question[] };
  initialIsActive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const { mutate } = useSWRConfig();
  const { data } = useSWR<{ id: string; surveyId: string; isActive: boolean }>(
    `/api/raffles/${raffleId}`,
    (url: string) => fetch(url).then(r => r.json()),
    { refreshInterval: 4000 },
  );
  const isActive = data?.isActive ?? initialIsActive;

  function handleSuccess() {
    setOpen(false);
    setToast(true);
    mutate(`/api/raffles/${raffleId}/participants`);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <>
      {isActive ? (
        <>
          <button
            onClick={() => canParticipate && setOpen(true)}
            disabled={!canParticipate}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            🎟️ Participar
          </button>
          {!canParticipate && (
            <span className="ml-3 text-xs text-slate-400">Ya participaste desde este dispositivo</span>
          )}
        </>
      ) : (
        <span className="inline-flex items-center rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-800">
          Sorteo finalizado
        </span>
      )}
      <Modal open={open} onClose={() => setOpen(false)} titleId="raffle-form-title">
        <h2 id="raffle-form-title" className="text-lg font-bold mb-2">
          Participar en el sorteo
        </h2>
        <p className="text-xs text-slate-400 mb-4">Completa tus datos para unirte.</p>
        <PublicSurveyForm survey={survey} raffleId={raffleId} onSuccess={handleSuccess} />
      </Modal>
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-md bg-emerald-600 text-white px-4 py-2 shadow-lg text-sm">
          Participación registrada
        </div>
      )}
    </>
  );
}
