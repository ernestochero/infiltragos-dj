'use client';

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import type { QuestionAnalytics } from '@survey/types/analytics';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6B7280'];

interface Props {
  data: QuestionAnalytics;
}

export default function QuestionChart({ data }: Props) {
  if (data.total === 0) {
    return <p className="text-sm text-slate-400">Sin respuestas todavía</p>;
  }

  switch (data.type) {
    case 'SINGLE_CHOICE': {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data.counts} dataKey="count" nameKey="label" label>
              {data.counts.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    case 'MULTIPLE_CHOICE': {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.counts}>
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#6366F1" />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    case 'SHORT_TEXT':
    case 'LONG_TEXT': {
      return (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">Top 10 respuestas</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">
            {data.top.map(item => (
              <li key={item.value} className="flex justify-between gap-2">
                <span className="truncate">{item.value}</span>
                <span className="text-slate-400">{item.count}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-slate-400">Respuestas únicas: {data.unique}</p>
          {data.topWords && data.topWords.length > 0 && (
            <div>
              <p className="mt-2 text-sm text-slate-400">Palabras más repetidas</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {data.topWords.map(w => (
                  <span
                    key={w.word}
                    className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-200"
                  >
                    {w.word} ({w.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
