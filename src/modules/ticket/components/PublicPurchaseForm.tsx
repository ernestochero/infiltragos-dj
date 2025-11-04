'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TicketDownloadCard, { downloadTicketCard } from '@ticket/components/TicketDownloadCard';

type PurchaseTicketType = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  available: number;
};

type PurchaseResult = {
  tickets: {
    code: string;
    qrPayload: string;
    sequence?: number | null;
  }[];
  recipientEmail: string;
  event: {
    id: string;
    title: string;
    startsAt?: string | null;
    venue?: string | null;
  };
  ticketType: {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
  };
  buyerName: string;
};

type Props = {
  slug: string;
  ticketTypes: PurchaseTicketType[];
  isPastEvent?: boolean;
};

type TicketPaymentStatus =
  | 'PENDING'
  | 'FORM_READY'
  | 'PAID'
  | 'DECLINED'
  | 'CANCELLED'
  | 'ERROR'
  | 'FULFILLED';

type CheckoutInitResponse = {
  orderCode: string;
  formToken: string;
  publicKey: string;
  scriptUrl: string;
  amountCents: number;
  currency: string;
  ticketType: {
    id: string;
    name: string;
    priceCents: number;
  };
  event: {
    id: string;
    slug: string;
    title: string;
  };
  buyer: {
    name: string;
    email: string;
    phone?: string | null;
  };
};

type FinalizeResponse = {
  paymentStatus: TicketPaymentStatus;
  providerStatus?: string | null;
  message?: string | null;
  orderCode: string;
  transactionUuid?: string | null;
  result?: PurchaseResult;
};

type FinalizePayload = {
  orderCode: string;
  providerStatus?: string;
  transactionUuid?: string;
  answer?: Record<string, unknown> | null | undefined;
};

declare global {
  interface Window {
    KR?: {
      ready?: boolean;
      removeForms?: () => Promise<void> | void;
      setFormConfig?: (config: Record<string, unknown>) => Promise<void>;
      setFormToken?: (token: string) => Promise<void>;
      renderElements?: (selector: string) => Promise<void>;
      openPopin?: (options?: { formToken?: string }) => void;
      closePopin?: () => void;
    };
    __IZIPAY_LOAD_PROMISE__?: Promise<unknown>;
    __IZIPAY_FORM_RENDERED__?: boolean;
    __IZIPAY_POPIN_OPEN__?: boolean;
  }
}

export default function PublicPurchaseForm({ slug, ticketTypes, isPastEvent = false }: Props) {
  const [selectedTypeId, setSelectedTypeId] = useState(ticketTypes[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [showTicketsInline, setShowTicketsInline] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<CheckoutInitResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<TicketPaymentStatus | null>(null);
  const orderRef = useRef<CheckoutInitResponse | null>(null);
  const finalizingRef = useRef(false);
  const smartformContainerRef = useRef<HTMLDivElement | null>(null);
  const smartformTargetRef = useRef<HTMLDivElement | null>(null);
  const publicKeyRef = useRef<string | null>(null);
  const isPast = Boolean(isPastEvent);
  const isPurchaseDisabled = isPast || ticketTypes.length === 0;
  const unavailableMessage = isPast
    ? 'Este evento ya finalizó. Gracias por acompañarnos.'
    : 'Los tickets estarán disponibles muy pronto. Mantente atento.';

  const selectedType = useMemo(
    () => ticketTypes.find((type) => type.id === selectedTypeId) ?? ticketTypes[0],
    [ticketTypes, selectedTypeId],
  );

  const maxQuantity = selectedType ? Math.max(selectedType.available, 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPurchaseDisabled) {
      setError(isPast ? 'Este evento ya finalizó.' : 'No hay tickets disponibles en este momento.');
      return;
    }
    if (!selectedType) {
      setError('Selecciona un tipo de ticket disponible');
      return;
    }
    if (!buyerName.trim() || !buyerEmail.trim()) {
      setError('Completa tu nombre y correo electrónico');
      return;
    }
    if (maxQuantity === 0) {
      setError('No hay stock disponible para este ticket');
      return;
    }
    if (quantity > maxQuantity) {
      setError(`Solo hay ${maxQuantity} tickets disponibles para esta categoría`);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setShowTicketsInline(false);
    setPaymentStatus(null);
    try {
      const res = await fetch(`/api/events/${slug}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketTypeId: selectedType.id,
          quantity,
          buyerName,
          buyerEmail,
          buyerPhone: buyerPhone || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'No pudimos completar tu compra');
      }
      const init = (await res.json()) as CheckoutInitResponse;
      setCurrentOrder(init);
      orderRef.current = init;
      publicKeyRef.current = init.publicKey;
      setPaymentStatus('FORM_READY');
      await initializeSmartform(init);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setCurrentOrder(null);
      orderRef.current = null;
      setPaymentStatus(null);
      window.KR?.closePopin?.();
      window.__IZIPAY_POPIN_OPEN__ = false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cardRefs.current = {};
  }, [result]);

  useEffect(() => {
    orderRef.current = currentOrder;
  }, [currentOrder]);

  const total = selectedType ? (selectedType.priceCents / 100) * quantity : 0;

  const handleSmartformSuccess = useCallback(
    async (event: Event) => {
      const detail = extractSmartformDetail(event);
      const order = orderRef.current;
      if (!order || finalizingRef.current) return;
      finalizingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const finalizePayload = buildFinalizePayload(order, detail);
        if (!finalizePayload.orderCode) {
          throw new Error('No pudimos identificar el pedido confirmado.');
        }
        if (!finalizePayload.providerStatus) {
          finalizePayload.providerStatus = 'PAID';
        }
        const response = await fetch(`/api/events/${slug}/checkout/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalizePayload),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || 'No pudimos confirmar el pago.');
        }
        const data = (await response.json()) as FinalizeResponse;
        setPaymentStatus(data.paymentStatus);
        if (data.result) {
          setResult({
            ...data.result,
            buyerName: data.result.buyerName || order.buyer.name,
          });
          setShowTicketsInline(true);
          setExpandedTicket(null);
          setBuyerName('');
          setBuyerEmail('');
          setBuyerPhone('');
          setQuantity(1);
          setSelectedTypeId(ticketTypes[0]?.id ?? selectedType?.id ?? '');
          setCurrentOrder(null);
          orderRef.current = null;
          window.KR?.closePopin?.();
          window.__IZIPAY_POPIN_OPEN__ = false;
        } else {
          setError(
            data.paymentStatus === 'PAID'
              ? 'Pago recibido. Estamos generando tus tickets, te enviaremos un correo en breve.'
              : data.message || 'Tu pago está en revisión.',
          );
        }
      } catch (err) {
        console.error('[Smartform success handler] finalize error', err);
        setError(err instanceof Error ? err.message : 'No pudimos finalizar el pago.');
      } finally {
        finalizingRef.current = false;
        setLoading(false);
      }
    },
    [slug, ticketTypes, selectedType],
  );

  const finalizeDeclined = useCallback(
    async (order: CheckoutInitResponse, detail: unknown) => {
      const payload = buildFinalizePayload(order, detail);
      const body: FinalizePayload = {
        orderCode: payload.orderCode,
        providerStatus: payload.providerStatus ?? 'DECLINED',
        transactionUuid: payload.transactionUuid,
        answer: payload.answer,
      };
      try {
        await fetch(`/api/events/${slug}/checkout/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (error) {
        console.warn('[Smartform decline notifier] request failed', error);
      }
    },
    [slug],
  );

  const handleSmartformError = useCallback(
    (event: Event) => {
      const detail = extractSmartformDetail(event);
      console.error('[Smartform error]', detail);
      finalizingRef.current = false;
      setLoading(false);
      setPaymentStatus('DECLINED');
      setError('No pudimos completar el pago. Intenta nuevamente.');
      const order = orderRef.current;
      if (order) {
        finalizeDeclined(order, detail).catch((err) => {
          console.warn('[Smartform error] finalizeDeclined failed', err);
        });
      }
      setCurrentOrder(null);
      orderRef.current = null;
      window.KR?.closePopin?.();
      window.__IZIPAY_POPIN_OPEN__ = false;
    },
    [finalizeDeclined],
  );

  useEffect(() => {
    const successListener = (event: Event) => handleSmartformSuccess(event);
    const errorListener = (event: Event) => handleSmartformError(event);
    const popinCloseListener = () => {
      window.__IZIPAY_POPIN_OPEN__ = false;
    };

    document.addEventListener('kr-payment-success', successListener as EventListener);
    document.addEventListener('krPaymentSuccess', successListener as EventListener);
    document.addEventListener('kr-payment-error', errorListener as EventListener);
    document.addEventListener('krPaymentError', errorListener as EventListener);
    document.addEventListener('kr-payment-failure', errorListener as EventListener);
    document.addEventListener('kr-popin-close', popinCloseListener);

    return () => {
      document.removeEventListener('kr-payment-success', successListener as EventListener);
      document.removeEventListener('krPaymentSuccess', successListener as EventListener);
      document.removeEventListener('kr-payment-error', errorListener as EventListener);
      document.removeEventListener('krPaymentError', errorListener as EventListener);
      document.removeEventListener('kr-payment-failure', errorListener as EventListener);
      document.removeEventListener('kr-popin-close', popinCloseListener);
    };
  }, [handleSmartformSuccess, handleSmartformError]);

  return (
    <div className="space-y-4">
      {!showTicketsInline && (
        isPurchaseDisabled ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-center text-sm text-gray-300">
            {unavailableMessage}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-5">
            <div>
              <p className="text-sm font-semibold text-gray-100">Compra tus entradas</p>
              <p className="text-xs text-gray-400">
                El pago se procesa con Izipay Smartform. La ventana emergente te permitirá pagar con tarjeta o Yape sin
                salir de esta página.
              </p>
            </div>

            {error && (
              <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {error}
              </p>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Tipo de ticket</label>
              <select
                value={selectedType?.id}
                onChange={(e) => {
                  setSelectedTypeId(e.target.value);
                  setQuantity(1);
                }}
                className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
              >
                {ticketTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} · {formatPrice(type.priceCents, type.currency)}{' '}
                    {type.available <= 0 ? '(Agotado)' : ''}
                  </option>
                ))}
              </select>
              {selectedType && (
                <p className="text-xs text-gray-400">
                  {selectedType.description || ''} {selectedType.available} disponibles
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-gray-300">Nombre completo</label>
                <input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300">Correo electrónico</label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                  placeholder="email@dominio.com"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300">Teléfono / WhatsApp</label>
                <input
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                  placeholder="999 999 999"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  max={maxQuantity || 1}
                  value={quantity}
                  onChange={(e) => {
                    const val = Number.parseInt(e.target.value, 10);
                    setQuantity(Number.isNaN(val) ? 1 : Math.max(1, Math.min(val, maxQuantity || 1)));
                  }}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
                />
                <p className="text-xs text-gray-400">Disponibles: {maxQuantity}</p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100">
              <div className="flex items-center justify-between">
                <span>Total</span>
                <strong>{formatPrice(total * 100, selectedType?.currency || 'PEN')}</strong>
              </div>
              <p className="text-xs text-gray-400">
                Al completar la compra enviaremos los tickets y QRs a tu correo electrónico. Preséntalos en la puerta
                para ingresar.
              </p>
            </div>

            {currentOrder && (
              <div className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100">
                Completa el formulario emergente de Izipay para finalizar tu pago. Si lo cerraste accidentalmente,
                vuelve a presionar el botón para abrirlo de nuevo.
              </div>
            )}

            {paymentStatus && paymentStatus !== 'FORM_READY' && (
              <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200">
                Estado del pago: <strong>{describePaymentStatus(paymentStatus)}</strong>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedType || maxQuantity === 0}
              className="w-full rounded-md bg-[linear-gradient(120deg,#ed1c24,#f7931e)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[rgba(237,28,36,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Procesando…' : 'Pagar con Izipay'}
            </button>
          </form>
        )
      )}

      {showTicketsInline && result && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-5">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <p className="font-semibold">¡Compra confirmada!</p>
            <p className="text-xs text-emerald-50">
              Te enviamos los QR a <strong>{result.recipientEmail}</strong>. También puedes descargarlos aquí.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-100 hover:bg-white/10 disabled:opacity-60"
            >
              {downloadingAll ? 'Descargando…' : 'Descargar todos'}
            </button>
          </div>
          <div className="space-y-3">
            {result.tickets.map((ticket, index) => (
              <div key={ticket.code} className="rounded-lg border border-white/10 bg-black/30">
                <button
                  type="button"
                  onClick={() => setExpandedTicket((prev) => (prev === ticket.code ? null : ticket.code))}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-gray-100 hover:bg-white/5"
                >
                  <span>
                    Ticket #{ticket.sequence ?? index + 1} · <span className="text-xs text-gray-400">{ticket.code}</span>
                  </span>
                  <span className="text-xs text-gray-400">{expandedTicket === ticket.code ? 'Ocultar' : 'Ver'}</span>
                </button>
                {(expandedTicket === ticket.code || result.tickets.length === 1) && (
                  <div className="border-t border-white/10 p-4 overflow-x-auto">
                    <TicketDownloadCard
                      ticket={ticket}
                      event={result.event}
                      ticketType={result.ticketType}
                      buyerName={result.buyerName}
                      width={640}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md bg-[linear-gradient(120deg,#ed1c24,#f7931e)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[rgba(237,28,36,0.35)] transition hover:opacity-95"
            >
              Comprar más entradas
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="absolute left-[-9999px] top-0 w-[600px]" aria-hidden="true">
          {result.tickets.map((ticket) => (
            <TicketDownloadCard
              key={`hidden-${ticket.code}`}
              ticket={ticket}
              event={result.event}
              ticketType={result.ticketType}
              buyerName={result.buyerName}
              className="mb-4"
              hideDownloadButton
              refCallback={(node) => {
                cardRefs.current[ticket.code] = node;
              }}
              width={640}
            />
          ))}
        </div>
      )}

    </div>
  );

  async function handleDownloadAll() {
    if (!result) return;
    try {
      setDownloadingAll(true);
      for (const ticket of result.tickets) {
        const node = cardRefs.current[ticket.code];
        if (node) {
          await downloadTicketCard(node, ticket.code);
        }
      }
    } finally {
      setDownloadingAll(false);
    }
  }

  function resetForm() {
    setShowTicketsInline(false);
    setResult(null);
    setExpandedTicket(null);
    setBuyerName('');
    setBuyerEmail('');
    setBuyerPhone('');
    setQuantity(1);
    setSelectedTypeId(ticketTypes[0]?.id ?? '');
    window.KR?.closePopin?.();
    window.__IZIPAY_POPIN_OPEN__ = false;
  }

  async function initializeSmartform(order: CheckoutInitResponse) {
    if (typeof window === 'undefined') return;
    const KR = await loadSmartformLibrary(order.publicKey, order.scriptUrl);
    if (!KR) {
      throw new Error('El formulario de pago no está disponible en este momento.');
    }
    const target = ensureSmartformTarget();
    if (KR.removeForms) {
      await Promise.resolve(KR.removeForms());
      window.__IZIPAY_FORM_RENDERED__ = false;
    }

    if (KR.setFormConfig) {
      await KR.setFormConfig({
        publicKey: order.publicKey,
        language: 'es-PE',
        'kr-popin': true,
      });
    }

    if (KR.renderElements) {
      await KR.renderElements(`#${target.id}`);
      window.__IZIPAY_FORM_RENDERED__ = true;
    }

    if (KR.setFormToken) {
      await KR.setFormToken(order.formToken);
    }

    try {
      KR.openPopin?.();
      window.__IZIPAY_POPIN_OPEN__ = true;
    } catch (error) {
      console.warn('[Izipay] openPopin failed', error);
    }
  }

  async function loadSmartformLibrary(publicKey: string, scriptUrl: string) {
    if (typeof window === 'undefined') throw new Error('El formulario de pago no está disponible.');
    if (window.KR?.ready) {
      if (publicKeyRef.current !== publicKey && window.KR.setFormConfig) {
        await window.KR.setFormConfig({ publicKey });
      }
      publicKeyRef.current = publicKey;
      return window.KR;
    }

    if (window.__IZIPAY_LOAD_PROMISE__) {
      await window.__IZIPAY_LOAD_PROMISE__;
      if (window.KR?.setFormConfig) {
        await window.KR.setFormConfig({ publicKey });
      }
      publicKeyRef.current = publicKey;
      return window.KR;
    }

    window.__IZIPAY_LOAD_PROMISE__ = new Promise<void>((resolve, reject) => {
      let script = document.querySelector<HTMLScriptElement>('script[data-izipay-smartform="true"]');
      if (!script) {
        script = document.createElement('script');
        script.async = true;
        script.dataset.izipaySmartform = 'true';
        script.src = scriptUrl;
        script.setAttribute('kr-language', 'es-PE');
        script.setAttribute('kr-spa-mode', 'true');
        document.body?.appendChild(script);
      }
      script.setAttribute('kr-public-key', publicKey);
      script.onload = async () => {
        try {
          if (window.KR?.setFormConfig) {
            await window.KR.setFormConfig({ publicKey });
          }
          resolve();
        } catch (err) {
          reject(err instanceof Error ? err : new Error('No se pudo preparar el formulario de pago.'));
        }
      };
      script.onerror = () => reject(new Error('No se pudo cargar el script de Izipay.'));
    });

    await window.__IZIPAY_LOAD_PROMISE__;
    publicKeyRef.current = publicKey;
    return window.KR;
  }

  function ensureSmartformTarget() {
    let host = smartformContainerRef.current;
    if (!host) {
      host = document.createElement('div');
      host.id = 'izipay-smartform-root';
      host.style.position = 'fixed';
      host.style.top = '-9999px';
      host.style.left = '-9999px';
      host.style.width = '0';
      host.style.height = '0';
      host.setAttribute('aria-hidden', 'true');
      document.body?.appendChild(host);
      smartformContainerRef.current = host;
    }

    let target = smartformTargetRef.current;
    if (!target || !host.contains(target)) {
      target = document.createElement('div');
      target.className = 'kr-smart-form';
      target.setAttribute('kr-popin', 'true');
      target.id = target.id || `kr-smartform-${Date.now()}`;
      host.appendChild(target);
      smartformTargetRef.current = target;
    }

    return target;
  }

  function extractSmartformDetail(event: Event) {
    if (!event) return null;
    if ('detail' in event) {
      return (event as CustomEvent).detail ?? null;
    }
    return (event as unknown as { detail?: unknown })?.detail ?? null;
  }

}

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: currency || 'PEN',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function describePaymentStatus(status: TicketPaymentStatus) {
  switch (status) {
    case 'FORM_READY':
      return 'Esperando confirmación';
    case 'PENDING':
      return 'En proceso';
    case 'PAID':
      return 'Pago aprobado';
    case 'DECLINED':
      return 'Pago rechazado';
    case 'CANCELLED':
      return 'Pago cancelado';
    case 'ERROR':
      return 'Error en el pago';
    case 'FULFILLED':
      return 'Tickets emitidos';
    default:
      return status;
  }
}

function buildFinalizePayload(order: CheckoutInitResponse, rawDetail: unknown): FinalizePayload {
  const detail =
    rawDetail && typeof rawDetail === 'object' && rawDetail && 'clientAnswer' in (rawDetail as Record<string, unknown>)
      ? ((rawDetail as Record<string, unknown>).clientAnswer as Record<string, unknown> | null | undefined) ??
        (rawDetail as Record<string, unknown>)
      : (rawDetail as Record<string, unknown> | null | undefined);

  const answer = detail ?? null;

  let orderCode = order.orderCode;
  if (answer && typeof answer.orderId === 'string') {
    orderCode = answer.orderId;
  } else if (answer && typeof answer.orderDetails === 'object' && answer.orderDetails) {
    const orderDetails = answer.orderDetails as Record<string, unknown>;
    if (typeof orderDetails.orderId === 'string') {
      orderCode = orderDetails.orderId;
    }
  } else if (answer && typeof answer.order === 'object' && answer.order) {
    const orderData = answer.order as Record<string, unknown>;
    if (typeof orderData.id === 'string') {
      orderCode = orderData.id;
    }
  } else if (rawDetail && typeof rawDetail === 'object' && rawDetail && 'orderId' in rawDetail) {
    const rawOrder = rawDetail as Record<string, unknown>;
    if (typeof rawOrder.orderId === 'string') {
      orderCode = rawOrder.orderId;
    }
  }

  let providerStatus: string | undefined;
  if (answer && typeof answer.orderStatus === 'string') {
    providerStatus = answer.orderStatus;
  } else if (answer && typeof answer.status === 'string') {
    providerStatus = answer.status;
  } else if (answer && typeof answer.transactionStatus === 'string') {
    providerStatus = answer.transactionStatus;
  } else if (rawDetail && typeof rawDetail === 'object' && rawDetail && 'status' in rawDetail) {
    const rawStatus = (rawDetail as Record<string, unknown>).status;
    if (typeof rawStatus === 'string') {
      providerStatus = rawStatus;
    }
  }

  const transactionUuid = extractTransactionUuidFromAnswer(answer) ?? undefined;

  return {
    orderCode,
    providerStatus,
    transactionUuid,
    answer: answer ?? undefined,
  };
}

function extractTransactionUuidFromAnswer(answer?: Record<string, unknown> | null) {
  if (!answer) return undefined;
  if (typeof answer.transactionUuid === 'string') return answer.transactionUuid;
  if (typeof answer.uuid === 'string') return answer.uuid;
  if (Array.isArray(answer.transactions) && answer.transactions.length) {
    const latest = answer.transactions[answer.transactions.length - 1] as Record<string, unknown>;
    if (latest) {
      if (typeof latest.uuid === 'string') return latest.uuid;
      if (typeof latest.uuidTransaction === 'string') return latest.uuidTransaction;
    }
  }
  return undefined;
}
