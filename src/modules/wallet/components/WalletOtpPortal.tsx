"use client";

import { useEffect, useMemo, useState } from 'react';

type RequestState = 'idle' | 'requesting' | 'awaiting-code' | 'verifying' | 'success';

const DEFAULT_COUNTRY = '+51';
const OTP_DIGITS = parseInt(process.env.NEXT_PUBLIC_WALLET_OTP_LENGTH || '6', 10);

const sanitizePhoneInput = (value: string) => value.replace(/[^\d\s-]/g, '');
const normalizeForApi = (localPart: string) => `${DEFAULT_COUNTRY}${localPart.replace(/[^\d]/g, '')}`;

export default function WalletOtpPortal() {
  const [localPhone, setLocalPhone] = useState('');
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [cooldownLeft, setCooldownLeft] = useState<number>(0);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = setInterval(() => {
      setCooldownLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownLeft]);

  useEffect(() => {
    if (requestState !== 'awaiting-code' || !expiresIn) return;
    const timer = setInterval(() => {
      setExpiresIn((prev) => {
        if (!prev) return prev;
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [requestState, expiresIn]);

  const canRequest = useMemo(() => {
    const digits = localPhone.replace(/\D/g, '');
    return digits.length >= 8 && cooldownLeft <= 0 && requestState !== 'requesting';
  }, [localPhone, cooldownLeft, requestState]);

  const canVerify = useMemo(() => {
    const code = otpCode.replace(/\D/g, '');
    return code.length === OTP_DIGITS && (requestState === 'awaiting-code' || requestState === 'verifying');
  }, [otpCode, requestState]);

  async function handleRequestOtp() {
    if (!canRequest) return;
    setRequestState('requesting');
    setError(null);
    setInfo(null);
    setOtpCode('');
    try {
      const response = await fetch('/api/wallet/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizeForApi(localPhone) }),
      });
      if (response.ok) {
        const json = await response.json();
        setInfo('Enviamos el código por WhatsApp. Revisa tus mensajes.');
        setExpiresIn(json.expiresIn ?? null);
        setCooldownLeft(json.cooldown ?? 60);
        setRequestState('awaiting-code');
      } else {
        const data = await response.json().catch(() => null);
        if (response.status === 404) {
          setError('No encontramos una wallet registrada con ese número. Regístrate primero en el formulario.');
        } else if (response.status === 429) {
          const retryAfter = data?.retryAfter ?? 60;
          setCooldownLeft(retryAfter);
          setError('Espera unos segundos antes de solicitar otro código.');
        } else {
          setError(data?.error || 'No pudimos enviar el código. Inténtalo nuevamente.');
        }
        setRequestState('idle');
      }
    } catch (err) {
      console.error('Wallet OTP request error', err);
      setError('Ocurrió un problema de conexión. Revisa tu red e inténtalo otra vez.');
      setRequestState('idle');
    }
  }

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canVerify) return;
    setRequestState('verifying');
    setError(null);
    try {
      const response = await fetch('/api/wallet/otp/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: normalizeForApi(localPhone),
          code: otpCode.replace(/\D/g, ''),
        }),
      });
      if (response.ok) {
        setInfo('¡Código verificado! Tu sesión se activó. Pronto verás tu perfil.');
        setRequestState('success');
      } else {
        const data = await response.json().catch(() => null);
        switch (data?.error) {
          case 'OTP_EXPIRED':
            setError('El código expiró. Solicita uno nuevo.');
            setRequestState('idle');
            setOtpCode('');
            break;
          case 'OTP_INVALID':
            setError('Código incorrecto. Verifica los números e inténtalo otra vez.');
            setRequestState('awaiting-code');
            break;
          case 'OTP_MAX_ATTEMPTS':
            setError('Superaste el número de intentos. Espera antes de solicitar uno nuevo.');
            setRequestState('idle');
            break;
          case 'PROFILE_NOT_FOUND':
            setError('No encontramos tu wallet. Completa primero el registro.');
            setRequestState('idle');
            break;
          default:
            setError('No pudimos validar el código. Inténtalo de nuevo.');
            setRequestState('awaiting-code');
        }
      }
    } catch (err) {
      console.error('Wallet OTP verify error', err);
      setError('Hubo un problema de conexión al validar el código.');
      setRequestState('awaiting-code');
    }
  }

  const handleResend = () => {
    if (cooldownLeft > 0 || requestState === 'requesting') return;
    handleRequestOtp();
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-2xl border border-white/10 bg-zinc-950/80 p-8 shadow-lg backdrop-blur">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Portal de Wallet</h1>
        <p className="text-sm text-gray-400">
          Ingresa tu número para recibir un código OTP por WhatsApp y acceder a tu perfil.
        </p>
      </header>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-300">
          Número de celular
        </label>
        <div className="flex gap-3">
          <span className="flex min-w-[140px] items-center justify-center rounded-md border border-white/15 bg-black/40 px-3 text-sm font-semibold uppercase tracking-[0.12em] text-white">
            Perú (+51)
          </span>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={localPhone}
            onChange={(event) => setLocalPhone(sanitizePhoneInput(event.target.value))}
            className="w-full rounded-md border border-white/15 bg-black/40 px-4 py-3 text-base text-white placeholder:text-gray-500 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder="987654321"
          />
        </div>
        <button
          type="button"
          onClick={handleRequestOtp}
          disabled={!canRequest}
          className="mt-3 w-full rounded-md bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {requestState === 'requesting' ? 'Enviando código…' : cooldownLeft > 0 ? `Reintentar en ${cooldownLeft}s` : 'Enviar código por WhatsApp'}
        </button>
      </div>

      <form onSubmit={handleVerifyOtp} className="space-y-3">
        <label htmlFor="otp" className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-300">
          Código OTP
        </label>
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          maxLength={OTP_DIGITS}
          value={otpCode}
          onChange={(event) => setOtpCode(event.target.value.replace(/[^\d]/g, '').slice(0, OTP_DIGITS))}
          className="w-full rounded-md border border-white/15 bg-black/40 px-4 py-3 text-center text-2xl tracking-[0.3em] text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder="••••••"
        />
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {requestState === 'awaiting-code' && expiresIn !== null
              ? expiresIn > 0
                ? `Caduca en ${expiresIn}s`
                : 'Código vencido'
              : 'Los códigos expiran en 5 minutos.'}
          </span>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldownLeft > 0 || requestState === 'requesting'}
            className="text-gray-300 hover:text-white disabled:opacity-50"
          >
            Reenviar código
          </button>
        </div>
        <button
          type="submit"
          disabled={!canVerify || requestState === 'verifying'}
          className="w-full rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {requestState === 'verifying' ? 'Verificando…' : 'Confirmar código'}
        </button>
      </form>

      {info && (
        <div className="rounded-md border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
          {info}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {requestState === 'success' && (
        <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          ¡Listo! Estamos cargando tu perfil con tus puntos y beneficios.
        </div>
      )}
    </div>
  );
}
