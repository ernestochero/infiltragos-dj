'use client';

import { useState } from 'react';
import { Question } from '@survey/lib/validation';
import { Input, Textarea, Select, Button, Fieldset } from '@survey/components/ui';

interface Props {
  survey: {
    id: string;
    name: string;
    description?: string | null;
    questions: Question[];
  };
  raffleId?: string;
  onSuccess?: () => void;
}

export default function PublicSurveyForm({ survey, raffleId, onSuccess }: Props) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (key: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');
    setFieldErrors({});
    try {
      const url = raffleId
        ? `/api/raffles/${raffleId}/participate`
        : `/api/surveys/${survey.id}/responses`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        if (raffleId) {
          onSuccess?.();
          setStatus('idle');
          setAnswers({});
          return;
        }
        setStatus('success');
        return;
      }
      const data = await res.json().catch(() => null);
      const flat = data?.error;
      if (flat?.fieldErrors && typeof flat.fieldErrors === 'object') {
        const map: Record<string, string> = {};
        for (const [k, arr] of Object.entries(flat.fieldErrors)) {
          const first = Array.isArray(arr) && arr.length > 0 ? String(arr[0]) : '';
          if (first) map[k] = first;
        }
        setFieldErrors(map);
        setError('Por favor corrige los campos marcados.');
      } else if (data?.error) {
        setError(typeof data.error === 'string' ? data.error : 'Error al enviar.');
      } else {
        setError('Error inesperado');
      }
      setStatus('error');
    } catch {
      setError('Error al enviar.');
      setStatus('error');
    }
  };

  const resetForm = () => {
    setAnswers({});
  };

  if (status === 'success') {
    return <p className="text-center text-lg">¡Gracias!</p>;
  }

  const disabled = survey.questions.length === 0 || status === 'loading';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {survey.questions.length === 0 && (
        <p className="text-sm text-muted-foreground">Esta encuesta no tiene preguntas.</p>
      )}
      {survey.questions.map(q => {
        const key = q.id ?? `q${q.order}`;
        return (
          <Fieldset key={key} className="space-y-2">
            <legend className="font-medium">
              {q.label}
              {q.required && <span className="ml-1 text-xs text-red-400">*</span>}
            </legend>
            {q.type === 'SHORT_TEXT' && (
              <Input
                id={key}
                value={(answers[key] as string) || ''}
                onChange={e => handleChange(key, e.target.value)}
                disabled={status === 'loading'}
              />
            )}
            {q.type === 'LONG_TEXT' && (
              <Textarea
                id={key}
                value={(answers[key] as string) || ''}
                onChange={e => handleChange(key, e.target.value)}
                disabled={status === 'loading'}
              />
            )}
            {q.type === 'EMAIL' && (
              <Input
                id={key}
                type="email"
                value={(answers[key] as string) || ''}
                onChange={e => handleChange(key, e.target.value)}
                disabled={status === 'loading'}
              />
            )}
            {q.type === 'PHONE' && (
              <Input
                id={key}
                type="tel"
                value={(answers[key] as string) || ''}
                onChange={e => handleChange(key, e.target.value)}
                disabled={status === 'loading'}
              />
            )}
            {q.type === 'DATE' && (
              <Input
                id={key}
                type="date"
                value={(answers[key] as string) || ''}
                onChange={e => handleChange(key, e.target.value)}
                disabled={status === 'loading'}
              />
            )}
            {q.type === 'SINGLE_CHOICE' && (
              <Select
                id={key}
                value={(answers[key] as string) || ''}
                onChange={e => handleChange(key, e.target.value)}
                disabled={status === 'loading'}
              >
                <option value="">Selecciona…</option>
                {q.options?.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
            {q.type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                {q.options?.map(o => {
                  const arr = (answers[key] as string[] | undefined) || [];
                  const checked = Array.isArray(arr) && arr.includes(o.value);
                  return (
                    <label key={o.value} className="flex items-center gap-2">
                      <Input
                        type="checkbox"
                        checked={checked}
                        onChange={e => {
                          const prev: string[] = Array.isArray(arr) ? arr : [];
                          if (e.target.checked) {
                            handleChange(key, [...prev, o.value]);
                          } else {
                            handleChange(key, prev.filter(v => v !== o.value));
                          }
                        }}
                        disabled={status === 'loading'}
                      />
                      <span>{o.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {q.helpText && <p className="text-xs text-muted-foreground">{q.helpText}</p>}
            {fieldErrors[key] && (
              <p className="text-xs text-red-500">{fieldErrors[key]}</p>
            )}
          </Fieldset>
        );
      })}
      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={disabled}>
          {status === 'loading' ? 'Enviando…' : raffleId ? 'Participar' : 'Enviar'}
        </Button>
        <Button type="button" variant="muted" onClick={resetForm} disabled={status === 'loading'}>
          Limpiar
        </Button>
      </div>
    </form>
  );
}
