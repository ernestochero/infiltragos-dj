import { notFound } from 'next/navigation';
import { getPublicEvent } from '@ticket/lib/service';
import PublicPurchaseForm from '@ticket/components/PublicPurchaseForm';

type Params = { slug: string };

export default async function PublicEventPage({ params }: { params: Params }) {
  const data = await getPublicEvent(params.slug).catch(() => null);
  if (!data) notFound();

  const ticketTypes = data.ticketTypes.map((type) => ({
    id: type.id,
    name: type.name,
    description: type.description,
    priceCents: type.priceCents,
    currency: type.currency,
    available: Math.max(type.totalQuantity - (type.stats.total - type.stats.cancelled), 0),
  }));

  const eventInfo = {
    title: data.event.title,
    summary: data.event.summary,
    description: data.event.description,
    bannerUrl: data.event.bannerUrl,
    startsAt: data.event.startsAt ? data.event.startsAt.toISOString() : null,
    endsAt: data.event.endsAt ? data.event.endsAt.toISOString() : null,
    venue: data.event.venue,
    address: data.event.address,
    city: data.event.city,
    country: data.event.country,
  };

  const referenceDate = data.event.endsAt ?? data.event.startsAt;
  const isPastEvent = referenceDate ? referenceDate.getTime() < Date.now() : false;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-400">backstage producciones</p>
          <h1 className="text-3xl font-semibold">{data.event.title}</h1>
          {data.event.summary && <p className="text-sm text-slate-300">{data.event.summary}</p>}
        </div>

        {eventInfo.bannerUrl && (
          <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-indigo-500/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={eventInfo.bannerUrl} alt={eventInfo.title} className="h-64 w-full object-cover" />
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-100">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoField label="Fecha" value={formatDate(eventInfo.startsAt)} />
            <InfoField label="Lugar" value={eventInfo.venue || 'Por confirmar'} />
            <InfoField
              label="Dirección"
              value={formatLocation(eventInfo.address, eventInfo.city, eventInfo.country)}
            />
          </div>
          {eventInfo.description && (
            <p className="mt-4 text-xs text-slate-300">{eventInfo.description}</p>
          )}
        </div>

        <PublicPurchaseForm slug={params.slug} ticketTypes={ticketTypes} isPastEvent={isPastEvent} />
      </div>
    </main>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return 'Pronto';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pronto';
  return date.toLocaleString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLocation(address?: string | null, city?: string | null, country?: string | null) {
  const parts = [address, city, country].filter(Boolean);
  if (parts.length === 0) return 'Por confirmar';
  return parts.join(', ');
}
