'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  id: string;
}

export default function SurveyTabs({ id }: Props) {
  const pathname = usePathname();
  const base = `/survey/${id}`;
  const tabs = [
    { href: `${base}/edit`, label: 'Editar' },
    { href: `${base}/results`, label: 'Resultados' },
  ];
  return (
    <div role="tablist" className="flex border-b border-white/10 text-sm">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={`px-3 py-2 -mb-px border-b-2 ${
              active
                ? 'border-indigo-400 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
