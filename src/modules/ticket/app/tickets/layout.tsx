import type { ReactNode } from 'react';
import Link from 'next/link';
import LogoutButton from '@survey/components/LogoutButton';

export default function TicketsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-3 md:px-4 lg:px-6 py-5 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ticket Module</h1>
          <p className="text-sm text-gray-300">Administra eventos, tickets y validaciones.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/tickets"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-blue-200 hover:bg-white/10"
          >
            Eventos
          </Link>
          <LogoutButton />
        </div>
      </div>
      {children}
    </main>
  );
}
