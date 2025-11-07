'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TicketDownloadCard, { downloadTicketCard } from '@ticket/components/TicketDownloadCard';
import { FaWhatsapp } from 'react-icons/fa';

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
  paymentsEnabled?: boolean;
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
  cssUrl: string;
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
    __IZIPAY_STYLE_PROMISE__?: Promise<void>;
    __IZIPAY_FORM_RENDERED__?: boolean;
    __IZIPAY_POPIN_OPEN__?: boolean;
  }
}

export default function PublicPurchaseForm({
  slug,
  ticketTypes,
  isPastEvent = false,
  paymentsEnabled = true,
}: Props) {
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
  const statusPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isPollingRef = useRef(false);
  const activeOrderCodeRef = useRef<string | null>(null);
  const smartformTargetRef = useRef<HTMLDivElement | null>(null);
  const publicKeyRef = useRef<string | null>(null);
  const isPast = Boolean(isPastEvent);
  const paymentsFeatureEnabled = paymentsEnabled !== false;
  const isPurchaseDisabled = isPast || ticketTypes.length === 0;
  const unavailableMessage = isPast
    ? 'Este evento ya finalizó. Gracias por acompañarnos.'
    : 'Los tickets estarán disponibles muy pronto. Mantente atento.';
  const canShowManualPurchaseCta = !isPast && ticketTypes.length > 0;

  const selectedType = useMemo(
    () => ticketTypes.find((type) => type.id === selectedTypeId) ?? ticketTypes[0],
    [ticketTypes, selectedTypeId],
  );

  const maxQuantity = selectedType ? Math.max(selectedType.available, 0) : 0;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isPollingRef.current = false;
      if (statusPollTimeoutRef.current) {
        clearTimeout(statusPollTimeoutRef.current);
        statusPollTimeoutRef.current = null;
      }
    };
  }, []);

  const stopStatusPolling = useCallback(() => {
    if (statusPollTimeoutRef.current) {
      clearTimeout(statusPollTimeoutRef.current);
      statusPollTimeoutRef.current = null;
    }
    isPollingRef.current = false;
    activeOrderCodeRef.current = null;
  }, []);

  const clearCurrentOrder = useCallback(
    (options?: { resetStatus?: boolean }) => {
      stopStatusPolling();
      setCurrentOrder(null);
      orderRef.current = null;
      activeOrderCodeRef.current = null;
      if (options?.resetStatus !== false) {
        setPaymentStatus(null);
      }
    },
    [stopStatusPolling],
  );

  const cleanupSmartformArtifacts = useCallback(() => {
    if (typeof document === 'undefined') return;
    const global = typeof window !== 'undefined' ? window : undefined;
    const popinOpen = global?.__IZIPAY_POPIN_OPEN__ === true;

    if (!popinOpen && global?.KR?.removeForms) {
      try {
        void Promise.resolve(global.KR.removeForms());
      } catch (error) {
        console.warn('[Izipay] removeForms cleanup failed', error);
      }
    }

    const target = smartformTargetRef.current;
    if (target && target.parentElement) {
      target.parentElement.removeChild(target);
      smartformTargetRef.current = null;
    }
    const orphanSmartforms = document.querySelectorAll<HTMLElement>(
      '#kr-smartform-wrapper, [id^="kr-smartform"], .kr-smart-form, .kr-detachment-area, .kr-attachment-area, #kr-toolbar, .kr-resource, .kr-smart-button-wrapper, .kr-smartform-modal-wrapper',
    );
    orphanSmartforms.forEach((node) => node.remove());

    const strayButtons = document.querySelectorAll<HTMLElement>(
      '.kr-popin-button, .kr-popin-button-enabled, #kr-popin-button, .kr-smart-form-modal-button',
    );
    strayButtons.forEach((node) => {
      if (!node) return;
      if (popinOpen) {
        node.style.setProperty('display', 'none', 'important');
        node.style.setProperty('visibility', 'hidden', 'important');
        node.style.setProperty('pointer-events', 'none', 'important');
      } else {
        node.remove();
      }
    });

    if (!popinOpen) {
      document.querySelectorAll<HTMLElement>('.kr-popin').forEach((container) => {
        container.remove();
      });
      document.querySelectorAll('script[data-izipay-smartform="true"]').forEach((script) => {
        script.parentElement?.removeChild(script);
      });
      document.querySelectorAll('link[data-izipay-smartform-style="true"]').forEach((link) => {
        link.parentElement?.removeChild(link);
      });
      if (global) {
        global.KR = undefined;
        global.__IZIPAY_FORM_RENDERED__ = false;
        global.__IZIPAY_LOAD_PROMISE__ = undefined;
        global.__IZIPAY_STYLE_PROMISE__ = undefined;
      }
    }

    ensurePopinButtonHidden();
  }, []);

  const dismissPopin = useCallback(
    (options?: { clearOrder?: boolean; resetStatus?: boolean }) => {
      if (typeof window === 'undefined') return;
      window.__IZIPAY_POPIN_OPEN__ = false;
      window.KR?.closePopin?.();
      if (options?.clearOrder !== false) {
        clearCurrentOrder({ resetStatus: options?.resetStatus });
      }
      cleanupSmartformArtifacts();
    },
    [cleanupSmartformArtifacts, clearCurrentOrder],
  );

  const startStatusPolling = useCallback(
    (orderCode: string) => {
      if (!orderCode) return;
      if (isPollingRef.current && activeOrderCodeRef.current === orderCode) {
        console.info('[Izipay] poll already running for', orderCode);
        return;
      }
      console.info('[Izipay] starting status polling', orderCode);
      isPollingRef.current = true;
      activeOrderCodeRef.current = orderCode;

      const poll = async () => {
        if (!isMountedRef.current) return;
        if (activeOrderCodeRef.current !== orderCode) return;

        try {
          console.info('[checkout status poll] tick', orderCode, new Date().toISOString());
          const response = await fetch(
            `/api/events/${slug}/checkout/status?orderCode=${encodeURIComponent(orderCode)}`,
            {
              method: 'GET',
              headers: { Accept: 'application/json' },
              cache: 'no-store',
            },
          );

          if (response.ok) {
            const data = (await response.json()) as FinalizeResponse;
            setPaymentStatus(data.paymentStatus);
            if (data.result && data.paymentStatus === 'FULFILLED') {
              const fallbackBuyerName = orderRef.current?.buyer.name;
              setResult({
                ...data.result,
                buyerName: data.result.buyerName || fallbackBuyerName || data.result.buyerName,
              });
              setShowTicketsInline(true);
              setExpandedTicket(null);
              setError(null);
              clearCurrentOrder({ resetStatus: false });
              dismissPopin({ clearOrder: false, resetStatus: false });
              return;
            }
          }
        } catch (err) {
          console.error('[checkout status poll] failed', err);
        }

        statusPollTimeoutRef.current = setTimeout(() => {
          poll();
        }, 2000);
      };

      poll();
    },
    [clearCurrentOrder, dismissPopin, slug],
  );

  useEffect(() => {
    if (!result && orderRef.current && paymentStatus && (paymentStatus === 'PAID' || paymentStatus === 'FULFILLED')) {
      startStatusPolling(orderRef.current.orderCode);
    }
  }, [paymentStatus, result, startStatusPolling]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPurchaseDisabled) {
      setError(isPast ? 'Este evento ya finalizó.' : 'No hay tickets disponibles en este momento.');
      return;
    }
    if (!paymentsFeatureEnabled) {
      setError('Los pagos no están disponibles en este momento.');
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
      startStatusPolling(init.orderCode);
      await initializeSmartform(init);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      clearCurrentOrder();
      dismissPopin({ clearOrder: false });
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    ensurePopinButtonHidden();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => dismissPopin();
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      dismissPopin();
    };
  }, [dismissPopin]);

  const total = selectedType ? (selectedType.priceCents / 100) * quantity : 0;
  const submitLabel = loading
    ? 'Procesando…'
    : paymentsFeatureEnabled
      ? 'Comprar con Izipay'
      : 'Pagos no disponibles';
  const whatsappPurchaseUrl =
    'https://api.whatsapp.com/send?phone=51903166302&text=Quiero%20comprar%20mi%20entrada%20para%20POPER';

  const handleSmartformSuccess = useCallback(
    async (event: Event) => {
      console.info('[Izipay] payment success event', event);
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
          clearCurrentOrder({ resetStatus: false });
          dismissPopin({ clearOrder: false, resetStatus: false });
        } else {
          setError(
            data.paymentStatus === 'PAID'
              ? 'Pago recibido. Estamos generando tus tickets, te enviaremos un correo en breve.'
              : data.message || 'Tu pago está en revisión.',
          );
          startStatusPolling(finalizePayload.orderCode);
        }
      } catch (err) {
        console.error('[Smartform success handler] finalize error', err);
        setError(err instanceof Error ? err.message : 'No pudimos finalizar el pago.');
        if (order?.orderCode) {
          startStatusPolling(order.orderCode);
        }
      } finally {
        finalizingRef.current = false;
        setLoading(false);
      }
    },
    [clearCurrentOrder, dismissPopin, slug, ticketTypes, selectedType, startStatusPolling],
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
      console.warn('[Izipay] payment error event', event);
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
      clearCurrentOrder({ resetStatus: false });
      dismissPopin({ clearOrder: false, resetStatus: false });
    },
    [clearCurrentOrder, dismissPopin, finalizeDeclined],
  );

  useEffect(() => {
    const successListener = (event: Event) => handleSmartformSuccess(event);
    const errorListener = (event: Event) => handleSmartformError(event);
    const popinCloseListener = () => {
      dismissPopin();
      if (!result) {
        setError('Pago cancelado. Puedes intentar nuevamente.');
      }
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
  }, [dismissPopin, handleSmartformSuccess, handleSmartformError, result]);

  return (
    <div className="space-y-4">
      {!showTicketsInline && (
        isPurchaseDisabled ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-center text-sm text-gray-300">
            {unavailableMessage}
          </div>
        ) : paymentsFeatureEnabled ? (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-5">
            <div>
              <p className="text-sm font-semibold text-gray-100">Compra tus entradas</p>
              <p className="text-xs text-gray-400">
                El pago se procesa con Izipay. La ventana emergente te permitirá pagar con tarjeta sin salir de esta página.
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
              disabled={loading || !selectedType || maxQuantity === 0 || !paymentsFeatureEnabled}
              className="w-full rounded-md bg-[linear-gradient(120deg,#ed1c24,#f7931e)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[rgba(237,28,36,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitLabel}
            </button>
          </form>
        ) : (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-50">
            <p className="font-semibold text-amber-100">Pagos con tarjeta no disponibles</p>
            <p className="text-xs text-amber-50">
              Las compras online con Izipay están deshabilitadas temporalmente. Escríbenos por WhatsApp y coordinamos tu
              reserva con transferencia, depósito u otro método.
            </p>
          </div>
        )
      )}

      {!showTicketsInline && canShowManualPurchaseCta && (
        <div className="rounded-xl border border-white/10 bg-black/15 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-100">
              {paymentsFeatureEnabled ? '¿Prefieres otro medio de pago?' : 'Compra por WhatsApp'}
            </p>
            <p className="text-xs text-gray-400">
              {paymentsFeatureEnabled
                ? 'También puedes coordinar tu compra por WhatsApp si prefieres transferencias, efectivo u otro medio diferente a tarjeta.'
                : 'Por ahora estamos atendiendo las compras manualmente. Escríbenos y reservamos tus entradas al instante.'}
            </p>
          </div>
          <a
            href={whatsappPurchaseUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-50 shadow-inner shadow-emerald-500/20 transition hover:bg-emerald-500/25 sm:mt-0"
          >
            <FaWhatsapp className="text-lg" aria-hidden />
            Comprar por WhatsApp
          </a>
        </div>
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
    clearCurrentOrder();
    dismissPopin({ clearOrder: false });
  }

  async function initializeSmartform(order: CheckoutInitResponse) {
    if (typeof window === 'undefined') return;
    const KR = await loadSmartformLibrary(order.publicKey, order.scriptUrl, order.cssUrl);
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
      console.info('[Izipay] invoking openPopin');
      KR.openPopin?.();
      window.__IZIPAY_POPIN_OPEN__ = true;
      console.info('[Izipay] popin opened');
    } catch (error) {
      console.error('[Izipay] openPopin failed', error);
    }
  }

  async function loadSmartformLibrary(publicKey: string, scriptUrl: string, cssUrl: string) {
    if (typeof window === 'undefined') throw new Error('El formulario de pago no está disponible.');
    await ensureSmartformStyles(cssUrl);
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
    let target = smartformTargetRef.current;
    if (!target || !document.body.contains(target)) {
      target = document.createElement('div');
      target.id = `kr-smartform-${Date.now()}`;
      target.className = 'kr-smart-form';
      target.setAttribute('kr-popin', 'true');
      document.body.appendChild(target);
      smartformTargetRef.current = target;
    }
    return target;
  }

  function ensureSmartformStyles(cssUrl: string): Promise<void> | void {
    if (typeof document === 'undefined') return;
    const href = cssUrl?.trim();
    if (!href) return;
    ensurePopinButtonHidden();
    const selector = `link[data-izipay-smartform-style="true"][href="${href}"]`;
    const existing = document.querySelector<HTMLLinkElement>(selector);
    if (existing) {
      if (existing.dataset.loaded === 'true' || existing.sheet) return;
      window.__IZIPAY_STYLE_PROMISE__ ??= new Promise<void>((resolve, reject) => {
        existing.addEventListener('load', () => {
          existing.dataset.loaded = 'true';
          resolve();
        });
        existing.addEventListener('error', () =>
          reject(new Error('No se pudo cargar los estilos del formulario de pago.')),
        );
      });
      return window.__IZIPAY_STYLE_PROMISE__;
    }

    if (window.__IZIPAY_STYLE_PROMISE__) {
      return window.__IZIPAY_STYLE_PROMISE__;
    }

    window.__IZIPAY_STYLE_PROMISE__ = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-izipay-smartform-style', 'true');
      link.addEventListener('load', () => {
        link.dataset.loaded = 'true';
        resolve();
      });
      link.addEventListener('error', () =>
        reject(new Error('No se pudo cargar los estilos del formulario de pago.')),
      );
      (document.head ?? document.body).appendChild(link);
    });

    return window.__IZIPAY_STYLE_PROMISE__;
  }

  function extractSmartformDetail(event: Event) {
    if (!event) return null;
    if ('detail' in event) {
      return (event as CustomEvent).detail ?? null;
    }
    return (event as unknown as { detail?: unknown })?.detail ?? null;
  }

}

function ensurePopinButtonHidden() {
  if (typeof document === 'undefined') return;
  let style = document.querySelector<HTMLStyleElement>('style[data-izipay-hide-popin-button="true"]');
  if (!style) {
    style = document.createElement('style');
    style.type = 'text/css';
    style.dataset.izipayHidePopinButton = 'true';
    style.textContent = `
#kr-popin-button,
.kr-popin-button,
.kr-popin-button-enabled,
.kr-smart-form-modal-button {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
    `.trim();
  }
  document.head?.appendChild(style);
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
    rawDetail && typeof rawDetail === 'object' && 'clientAnswer' in (rawDetail as Record<string, unknown>)
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
  } else if (rawDetail && typeof rawDetail === 'object' && 'orderId' in rawDetail) {
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
  } else if (rawDetail && typeof rawDetail === 'object' && 'status' in rawDetail) {
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
