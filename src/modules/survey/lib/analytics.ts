import { Question } from './validation';
import { SurveyAnalytics, ChoiceCount, TextTopItem, WordCount } from '../types/analytics';

const STOP_WORDS = new Set([
  'de',
  'la',
  'el',
  'y',
  'a',
  'en',
  'con',
  'por',
  'un',
  'una',
  'los',
  'las',
  'del',
  'al',
  'se',
  'que',
  'lo',
  'su',
  'para',
  'es',
]);

function countChoices(
  question: Question,
  responses: Array<{ answers: Record<string, unknown> }>,
): { total: number; counts: ChoiceCount[] } {
  const key = question.id ?? `q${question.order}`;
  const map = new Map<string, number>();
  let total = 0;
  for (const opt of question.options ?? []) {
    map.set(opt.value, 0);
  }
  for (const r of responses) {
    const ans = r.answers[key];
    if (ans === undefined || ans === null) continue;
    if (question.type === 'MULTIPLE_CHOICE') {
      const arr = Array.isArray(ans) ? (ans as unknown[]) : [ans];
      for (const v of arr) {
        const s = String(v);
        map.set(s, (map.get(s) ?? 0) + 1);
        total++;
      }
    } else {
      const s = String(ans);
      map.set(s, (map.get(s) ?? 0) + 1);
      total++;
    }
  }
  const counts: ChoiceCount[] = (question.options ?? []).map(opt => ({
    value: opt.value,
    label: opt.label,
    count: map.get(opt.value) ?? 0,
  }));
  return { total, counts };
}

function topTexts(
  question: Question,
  responses: Array<{ answers: Record<string, unknown> }>,
): { total: number; top: TextTopItem[]; unique: number; topWords: WordCount[] } {
  const key = question.id ?? `q${question.order}`;
  const map = new Map<string, number>();
  const wordMap = new Map<string, number>();
  let total = 0;
  for (const r of responses) {
    const ans = r.answers[key];
    if (typeof ans !== 'string' || ans.trim() === '') continue;
    const val = ans.trim();
    map.set(val, (map.get(val) ?? 0) + 1);
    total++;
    const words = val
      .toLowerCase()
      .split(/[^\p{L}0-9]+/u)
      .filter(w => w && !STOP_WORDS.has(w));
    for (const w of words) {
      wordMap.set(w, (wordMap.get(w) ?? 0) + 1);
    }
  }
  const top = Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const topWords = Array.from(wordMap.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return { total, top, unique: map.size, topWords };
}

export function buildSurveyAnalytics(
  questions: Question[],
  responses: Array<{ answers: Record<string, unknown> }>,
): SurveyAnalytics {
  const result: SurveyAnalytics = [];
  for (const q of questions) {
    if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') {
      const { total, counts } = countChoices(q, responses);
      result.push({ id: q.id ?? `q${q.order}`, type: q.type, label: q.label, total, counts });
    } else if (q.type === 'SHORT_TEXT' || q.type === 'LONG_TEXT') {
      const { total, top, unique, topWords } = topTexts(q, responses);
      result.push({ id: q.id ?? `q${q.order}`, type: q.type, label: q.label, total, top, unique, topWords });
    }
  }
  return result;
}
