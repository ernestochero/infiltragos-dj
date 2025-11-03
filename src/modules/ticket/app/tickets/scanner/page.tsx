'use client';

import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type ScanStatus = 'idle' | 'loading' | 'success' | 'warning' | 'error';

type ScanResponse = {
  ticket: {
    code: string;
    ownerName: string;
    ownerEmail: string;
    status: string;
    validatedAt?: string | null;
    event: {
      title: string;
      startsAt?: string | null;
      venue?: string | null;
    };
    ticketType?: {
      id: string;
      name: string | null;
    } | null;
  };
  result: 'ACCEPTED' | 'DUPLICATE' | 'CANCELLED';
};

type EventContext = {
  id: string;
  title: string;
  startsAt?: string | null;
  venue?: string | null;
};

const toneMap: Record<ScanResponse['result'], ScanStatus> = {
  ACCEPTED: 'success',
  DUPLICATE: 'warning',
  CANCELLED: 'error',
};

function extractCode(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const candidate = parts.pop();
    if (candidate) return candidate.toUpperCase();
  } catch {
    // ignore, not a URL
  }
  return trimmed.toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function TicketScannerPage() {
  const searchParams = useSearchParams();
  const eventFilterId = (searchParams.get('eventId') || '').trim();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls>();
  const [codeInput, setCodeInput] = useState('');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ScanResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);
  const [eventContext, setEventContext] = useState<EventContext | null>(null);
  const [eventContextError, setEventContextError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventFilterId) {
      setEventContext(null);
      setEventContextError(null);
      return;
    }
    let cancelled = false;
    const fetchEvent = async () => {
      try {
        setEventContextError(null);
        const res = await fetch(`/api/admin/tickets/events/${eventFilterId}`);
        if (!res.ok) throw new Error('No se pudo cargar el evento');
        const data = await res.json();
        if (!cancelled) {
          setEventContext({
            id: data.event.id,
            title: data.event.title,
            startsAt: data.event.startsAt,
            venue: data.event.venue,
          });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setEventContextError('No se pudo cargar el evento seleccionado.');
          setEventContext(null);
        }
      }
    };
    fetchEvent();
    return () => {
      cancelled = true;
    };
  }, [eventFilterId]);

  const validateTicket = useCallback(
    async (code: string) => {
      try {
        setBusy(true);
        setStatus('loading');
        setMessage(null);
        const res = await fetch('/api/admin/tickets/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: code.trim(),
            device: 'scanner-module',
            eventId: eventFilterId || undefined,
          }),
        });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStatus('error');
        setMessage(data?.message || 'Ticket no encontrado');
        setLastScan(null);
        setShowDialog(false);
        setScannerLocked(false);
        return;
      }
      const data = (await res.json()) as ScanResponse;
      setLastScan(data);
      setStatus(toneMap[data.result]);
      if (data.result === 'ACCEPTED') {
        setMessage('Ticket validado correctamente');
        setShowDialog(true);
        setScannerLocked(true);
      } else if (data.result === 'DUPLICATE') {
        setMessage('Ticket ya fue validado anteriormente');
        setShowDialog(true);
        setScannerLocked(true);
      } else {
        setMessage('Ticket cancelado');
        setShowDialog(true);
        setScannerLocked(true);
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Error al validar el ticket');
      setLastScan(null);
      setShowDialog(false);
      setScannerLocked(false);
      } finally {
        setBusy(false);
      }
    },
    [eventFilterId],
  );

  const handleResult = useCallback(
    async (value: string) => {
      if (!value || busy || scannerLocked) return;
      await validateTicket(extractCode(value));
    },
    [busy, scannerLocked, validateTicket],
  );

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let isMounted = true;
    if (videoRef.current) {
      reader
        .decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, error, controls) => {
            if (!isMounted) return;
            if (controls) controlsRef.current = controls;
            if (result) {
              void handleResult(result.getText());
            }
            if (error) {
              // eslint-disable-next-line no-console
              console.debug('scanner error', error);
            }
          },
        )
        .catch((err) => {
          console.error('camera error', err);
          setMessage('No se pudo acceder a la cámara');
          setStatus('error');
        });
    }
    return () => {
      isMounted = false;
      controlsRef.current?.stop();
    };
  }, [handleResult]);

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!codeInput.trim()) return;
    await validateTicket(extractCode(codeInput));
    setCodeInput('');
  };

  const statusColors: Record<ScanStatus, string> = {
    idle: 'border-white/10 bg-black/20 text-gray-200',
    loading: 'border-blue-500/40 bg-blue-500/10 text-blue-100',
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
    error: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
  };

  return (
    <>
      <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-100">Scanner</h2>
        <p className="text-sm text-gray-300">Escanea el QR o ingresa el código manualmente.</p>
        {eventFilterId && eventContext && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Evento</p>
              <p className="font-semibold text-gray-100">{eventContext.title}</p>
              <p className="text-xs text-gray-400">
                {formatDate(eventContext.startsAt)} · {eventContext.venue ?? 'Venue por definir'}
              </p>
            </div>
            <Link
              href={`/tickets/${eventContext.id}`}
              className="text-xs text-indigo-300 hover:text-indigo-200"
            >
              Ver detalles
            </Link>
          </div>
        )}
        {eventFilterId && eventContextError && (
          <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {eventContextError}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <video
              ref={videoRef}
              className="h-[320px] w-full bg-black object-cover"
              muted
              autoPlay
              playsInline
            />
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Ingreso manual
            </label>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Código del ticket"
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              Validar
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className={`rounded-xl border px-4 py-3 text-sm ${statusColors[status]}`}>
            {status === 'idle' && <p>Escanea un ticket para comenzar.</p>}
            {status === 'loading' && <p>Validando ticket…</p>}
            {status !== 'idle' && status !== 'loading' && message && <p>{message}</p>}
          </div>

          {lastScan && (
            <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Evento</p>
                <p className="text-lg font-semibold text-gray-100">{lastScan.ticket.event.title}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(lastScan.ticket.event.startsAt)} · {lastScan.ticket.event.venue ?? 'Venue por definir'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBlock label="Código" value={lastScan.ticket.code} />
                <InfoBlock label="Tipo de ticket" value={lastScan.ticket.ticketType?.name || 'General'} />
                <InfoBlock label="Titular" value={lastScan.ticket.ownerName} />
                <InfoBlock label="Correo" value={lastScan.ticket.ownerEmail} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBlock label="Resultado" value={lastScan.result} />
                <InfoBlock
                  label="Validado"
                  value={
                    lastScan.ticket.validatedAt
                      ? formatDate(lastScan.ticket.validatedAt)
                      : 'Pendiente'
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>

      {showDialog && lastScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-slate-900 p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">{message || 'Resultado del escaneo'}</h3>
                <p className="text-xs text-gray-400">Confirma al invitado y continúa con el siguiente.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDialog(false);
                  setLastScan(null);
                  setStatus('idle');
                  setMessage(null);
                  setScannerLocked(false);
                }}
                className="rounded-md border border-white/10 px-2 py-1 text-xs text-gray-200 hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-gray-100">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Evento</p>
                <p className="font-semibold">{lastScan.ticket.event.title}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(lastScan.ticket.event.startsAt)} ·{' '}
                  {lastScan.ticket.event.venue ?? 'Venue por definir'}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <InfoBlock label="Código" value={lastScan.ticket.code} />
                <InfoBlock
                  label="Tipo"
                  value={lastScan.ticket.ticketType?.name || 'General'}
                />
                <InfoBlock label="Titular" value={lastScan.ticket.ownerName} />
                <InfoBlock label="Correo" value={lastScan.ticket.ownerEmail} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setLastScan(null);
                  setStatus('idle');
                  setMessage(null);
                  setShowDialog(false);
                  setScannerLocked(false);
                }}
                className="rounded-md border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
              >
                Escanear otro
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDialog(false);
                  setScannerLocked(false);
                }}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
