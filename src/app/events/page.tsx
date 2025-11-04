import type { ReactNode } from 'react';
import Link from 'next/link';
import { listPublicEvents } from '@ticket/lib/service';

export const revalidate = 60;

type EventCard = Awaited<ReturnType<typeof listPublicEvents>>[number];

export default async function EventsIndexPage() {
  const events = await listPublicEvents();
  const now = new Date();

  const upcoming: EventCard[] = [];
  const past: EventCard[] = [];

  events.forEach((event) => {
    const startsAt = event.startsAt ? new Date(event.startsAt) : null;
    if (!startsAt || startsAt >= now) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  });

  upcoming.sort((a, b) => {
    const aTime = a.startsAt ? new Date(a.startsAt).getTime() : 0;
    const bTime = b.startsAt ? new Date(b.startsAt).getTime() : 0;
    return aTime - bTime;
  });

  past.sort((a, b) => {
    const aTime = a.startsAt ? new Date(a.startsAt).getTime() : 0;
    const bTime = b.startsAt ? new Date(b.startsAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">
            Backstage Producciones
          </p>
          <h1 className="text-3xl font-semibold">Eventos</h1>
          <p className="text-sm text-slate-300">
            Explora nuestros shows publicados. Selecciona un evento para ver más detalles y comprar entradas.
          </p>
        </div>

        {upcoming.length === 0 && past.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-200">
            Aún no tenemos eventos publicados. Vuelve pronto para descubrir nuevas fechas.
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="space-y-4">
                <SectionTitle>Próximos eventos</SectionTitle>
                <EventGrid events={upcoming} />
              </section>
            )}

            {past.length > 0 && (
              <section className="space-y-4">
                <SectionTitle>Eventos pasados</SectionTitle>
                <EventGrid events={past} />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function EventGrid({ events }: { events: EventCard[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {events.map((event) => (
        <Link
          key={event.id}
          href={`/events/${event.slug || event.id}`}
          className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 shadow-lg shadow-black/20 transition hover:border-emerald-400/40 hover:shadow-emerald-500/10"
        >
          {event.bannerUrl && (
            <div className="relative h-48 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.bannerUrl}
                alt={event.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </div>
          )}
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                Publicado
              </span>
              <span className="text-slate-400">
                {formatDate(event.startsAt)}
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white group-hover:text-emerald-100">
                {event.title}
              </h2>
              {(event.summary || event.venue || event.city) && (
                <p className="text-sm text-slate-300">
                  {event.summary ?? [event.venue, event.city].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-white">{children}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-white/40 to-transparent" />
    </div>
  );
}

function formatDate(value?: Date | string | null) {
  if (!value) return 'Próximamente';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return 'Próximamente';
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Lima',
  });
}
