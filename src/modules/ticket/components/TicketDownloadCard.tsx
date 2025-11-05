'use client';

import { useEffect, useRef, useState } from 'react';
import * as QRCode from 'qrcode';
import { toPng } from 'html-to-image';

type Props = {
  ticket: {
    code: string;
    qrPayload: string;
    sequence?: number | null;
  };
  event: {
    title: string;
    startsAt?: string | null;
    venue?: string | null;
  };
  ticketType: {
    name: string;
    priceCents: number;
    currency: string;
  };
  buyerName: string;
  className?: string;
  hideDownloadButton?: boolean;
  refCallback?: (node: HTMLDivElement | null) => void;
  width?: number;
};

export default function TicketDownloadCard({
  ticket,
  event,
  ticketType,
  buyerName,
  className = '',
  hideDownloadButton = false,
  refCallback,
  width,
}: Props) {
  const [qr, setQr] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(ticket.qrPayload, {
      width: 240,
      margin: 1,
    })
      .then(setQr)
      .catch((err) => console.error('qr render error', err));
  }, [ticket.qrPayload]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      await downloadTicketCard(cardRef.current, ticket.code);
    } catch (err) {
      console.error('download ticket error', err);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (refCallback) refCallback(cardRef.current);
  }, [refCallback]);

  return (
    <div
      className={`w-full rounded-2xl border border-white/10 bg-white/90 p-4 text-slate-900 shadow-lg ${className}`}
      style={width ? { width } : undefined}
    >
      <div
        ref={cardRef}
        className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 md:flex-row"
        style={width ? { width: width - 32 } : undefined}
      >
        <div className="flex flex-col items-center justify-between border-r border-dashed border-slate-300 pr-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ticket Único</div>
          <div className="mt-2 flex w-full flex-col items-center gap-2 rounded-xl bg-slate-50 p-3">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={`QR ${ticket.code}`} className="h-36 w-36 rounded-lg border border-slate-200" />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-lg border border-slate-200 text-xs text-slate-400">
                Cargando…
              </div>
            )}
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Código</p>
            <p className="text-lg font-semibold tracking-widest">{ticket.code}</p>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Presenta este QR en la puerta. No lo compartas con terceros.
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-3 pl-0 md:pl-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{event.venue || 'Evento'}</p>
            <h4 className="text-2xl font-bold text-slate-900">{event.title}</h4>
            <p className="text-sm text-slate-600">{formatDate(event.startsAt)}</p>
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <InfoRow label="Titular" value={buyerName} />
            <InfoRow label="Tipo" value={ticketType.name} />
            <InfoRow label="Precio" value={formatPrice(ticketType.priceCents, ticketType.currency)} />
            <InfoRow label="Ticket #" value={ticket.sequence ? `#${ticket.sequence}` : 'Asignado'} />
          </div>
          <p className="text-xs text-slate-500">
            * El evento se reserva el derecho de admisión. Llega temprano para evitar colas en el ingreso.
          </p>
        </div>
      </div>
      {!hideDownloadButton && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {downloading ? 'Descargando…' : 'Descargar PNG'}
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return 'Fecha por confirmar';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha por confirmar';
  return date.toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });
}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: currency || 'PEN',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export async function downloadTicketCard(node: HTMLElement, code: string) {
  const dataUrl = await toPng(node, { cacheBust: true });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `ticket-${code}.png`;
  link.click();
}
