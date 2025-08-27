'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Option {
  id?: string;
  label: string;
  value: string;
}

interface Question {
  id?: string;
  type: string;
  label: string;
  required?: boolean;
  helpText?: string;
  options?: Option[];
}

interface SurveyFormProps {
  initial?: {
    id?: string;
    name: string;
    slug: string;
    description?: string | null;
    status: string;
    effectiveFrom?: string | null;
    questions: Question[];
  };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');

export default function SurveyForm({ initial }: SurveyFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [status, setStatus] = useState(initial?.status || 'DRAFT');
  const [effectiveFrom, setEffectiveFrom] = useState(
    initial?.effectiveFrom ? initial.effectiveFrom.slice(0, 10) : '',
  );
  const [questions, setQuestions] = useState<Question[]>(initial?.questions || []);

  const addQuestion = () => {
    setQuestions(qs => [
      ...qs,
      { type: 'SHORT_TEXT', label: '', required: false, options: [] },
    ]);
  };

  const updateQuestion = (idx: number, q: Partial<Question>) => {
    setQuestions(qs => qs.map((item, i) => (i === idx ? { ...item, ...q } : item)));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(qs => qs.filter((_, i) => i !== idx));
  };

  const moveQuestion = (idx: number, dir: number) => {
    setQuestions(qs => {
      const arr = [...qs];
      const [it] = arr.splice(idx, 1);
      arr.splice(idx + dir, 0, it);
      return arr;
    });
  };

  const addOption = (qIdx: number) => {
    setQuestions(qs => {
      const arr = [...qs];
      const q = arr[qIdx];
      q.options = q.options || [];
      q.options.push({ label: '', value: '' });
      return arr;
    });
  };

  const updateOption = (qIdx: number, oIdx: number, opt: Partial<Option>) => {
    setQuestions(qs => {
      const arr = [...qs];
      const q = arr[qIdx];
      if (!q.options) q.options = [];
      q.options[oIdx] = { ...q.options[oIdx], ...opt };
      return arr;
    });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions(qs => {
      const arr = [...qs];
      const q = arr[qIdx];
      if (q.options) q.options.splice(oIdx, 1);
      return arr;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      slug,
      description: description || undefined,
      status,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
      questions: questions.map((q, idx) => ({
        ...q,
        order: idx,
        options: q.options?.map((o, i) => ({ ...o, order: i })),
      })),
    };
    const res = await fetch(initial?.id ? `/api/surveys/${initial.id}` : '/api/surveys', {
      method: initial?.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      router.push('/survey');
    } else {
      alert('Error al guardar');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="block">Nombre</label>
        <input className="border p-2 w-full" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="block">Slug</label>
        <div className="flex gap-2">
          <input className="border p-2 w-full" value={slug} onChange={e => setSlug(e.target.value)} />
          <button type="button" onClick={() => setSlug(slugify(name))} className="px-2 py-1 border">Auto</button>
        </div>
      </div>
      <div className="space-y-2">
        <label className="block">Descripción</label>
        <textarea className="border p-2 w-full" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="block">Estado</label>
        <select className="border p-2" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="block">Vigente desde</label>
        <input type="date" className="border p-2" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
      </div>

      <div className="space-y-4">
        <h2 className="font-bold">Preguntas</h2>
        {questions.map((q, idx) => (
          <div key={idx} className="border p-2 space-y-2">
            <div className="flex justify-between">
              <span>Pregunta {idx + 1}</span>
              <div className="space-x-2">
                {idx > 0 && (
                  <button type="button" onClick={() => moveQuestion(idx, -1)}>↑</button>
                )}
                {idx < questions.length - 1 && (
                  <button type="button" onClick={() => moveQuestion(idx, 1)}>↓</button>
                )}
                <button type="button" onClick={() => removeQuestion(idx)}>Eliminar</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block">Tipo</label>
              <select
                className="border p-1"
                value={q.type}
                onChange={e => updateQuestion(idx, { type: e.target.value })}
              >
                <option value="SHORT_TEXT">SHORT_TEXT</option>
                <option value="LONG_TEXT">LONG_TEXT</option>
                <option value="EMAIL">EMAIL</option>
                <option value="PHONE">PHONE</option>
                <option value="DATE">DATE</option>
                <option value="SINGLE_CHOICE">SINGLE_CHOICE</option>
                <option value="MULTIPLE_CHOICE">MULTIPLE_CHOICE</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block">Etiqueta</label>
              <input
                className="border p-1 w-full"
                value={q.label}
                onChange={e => updateQuestion(idx, { label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={q.required || false}
                  onChange={e => updateQuestion(idx, { required: e.target.checked })}
                />
                Requerida
              </label>
            </div>
            {['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(q.type) && (
              <div className="space-y-2">
                <h3>Opciones</h3>
                {q.options?.map((o, oIdx) => (
                  <div key={oIdx} className="flex gap-2 items-center">
                    <input
                      className="border p-1"
                      placeholder="Label"
                      value={o.label}
                      onChange={e =>
                        updateOption(idx, oIdx, {
                          label: e.target.value,
                          value: slugify(e.target.value),
                        })
                      }
                    />
                    <button type="button" onClick={() => removeOption(idx, oIdx)}>
                      x
                    </button>
                  </div>
                ))}
                <button type="button" className="px-2 py-1 border" onClick={() => addOption(idx)}>
                  Añadir opción
                </button>
              </div>
            )}
          </div>
        ))}
        <button type="button" className="px-3 py-1 border" onClick={addQuestion}>
          Añadir pregunta
        </button>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="px-3 py-1 bg-blue-500 text-white">
          Guardar
        </button>
        <button type="button" className="px-3 py-1 border" onClick={() => router.push('/survey')}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
