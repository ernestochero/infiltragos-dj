'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Crumb {
  href?: string;
  label: string;
}

interface Props {
  items: Crumb[];
}

export default function Breadcrumbs({ items }: Props) {
  const pathname = usePathname();
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm text-gray-400">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const isActive = isLast || item.href === pathname;
          const content = item.href && !isLast ? (
            <Link href={item.href} className="hover:text-gray-200">
              {item.label}
            </Link>
          ) : (
            <span className={isActive ? 'text-gray-200' : undefined} aria-current={isActive ? 'page' : undefined}>
              {item.label}
            </span>
          );
          return (
            <li key={idx} className="flex items-center gap-1">
              {content}
              {!isLast && <span className="text-gray-500">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
