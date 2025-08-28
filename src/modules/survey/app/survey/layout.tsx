import type { ReactNode } from 'react';
import Link from 'next/link';
import LogoutButton from '@survey/components/LogoutButton';

export default function SurveyLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-3 md:px-4 lg:px-6 py-5 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Encuestas</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/survey/new"
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Nueva encuesta
          </Link>
          <LogoutButton />
        </div>
      </div>
      {children}
    </main>
  );
}
