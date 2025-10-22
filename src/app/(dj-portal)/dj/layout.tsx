'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/dj' },
  { label: 'Top semanal', href: '/dj/top-semanal' },
];

const LOGO_URL =
  'https://bucket-infiltragos.s3.us-east-1.amazonaws.com/logo-infiltragos-1024.png';

export default function DjLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-800 bg-dark-bg/95 backdrop-blur transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center border-b border-slate-800 px-5 py-4">
            <Image
              src={LOGO_URL}
              alt="Infiltragos"
              width={160}
              height={48}
              priority
              className="h-10 w-auto"
            />
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {NAV_ITEMS.map((item) => {
              const isRoot = item.href === '/dj';
              const active = isRoot
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-4 py-3 text-sm font-medium transition ${
                    active
                      ? 'bg-accent/90 text-dark-bg shadow-lg'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-5 pb-5 text-xs text-slate-500">
            Más secciones próximamente.
          </div>
        </div>
      </aside>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-800 bg-dark-bg/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              aria-label="Abrir navegación"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 bg-card-bg text-slate-200 shadow hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
            >
              <span className="sr-only">
                {sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
              </span>
              <span aria-hidden="true" className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-6 rounded-full bg-current" />
                <span className="block h-0.5 w-6 rounded-full bg-current" />
                <span className="block h-0.5 w-6 rounded-full bg-current" />
              </span>
            </button>
            <span className="hidden text-sm text-slate-400 lg:inline">
              Infiltragos Music · pedidos en vivo
            </span>
          </div>
        </header>
        <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
      </div>
    </div>
  );
}
