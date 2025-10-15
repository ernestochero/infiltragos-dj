"use client";

import { useState } from 'react';
import WalletSignupConfirmation from './WalletSignupConfirmation';

type FormValues = {
  fullName: string;
  dni: string;
  phoneNumber: string;
  email: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const INITIAL_VALUES: FormValues = {
  fullName: '',
  dni: '',
  phoneNumber: '',
  email: '',
};

export default function WalletSignupForm() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [countryCode] = useState<string>('+51');
  const countryLabel = 'Perú (+51)';
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<'created' | 'updated' | null>(null);
  const [messageStatus, setMessageStatus] = useState<{ status: string; reason?: string } | null>(null);

  function handleChange<T extends keyof FormValues>(field: T) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFieldErrors({});
    setGeneralError(null);
    setMessageStatus(null);
    setSuccessState(null);
    try {
      const nationalNumber = values.phoneNumber.replace(/\D/g, '');
      if (!nationalNumber) {
        setFieldErrors({ phoneNumber: 'Ingresa tu número de celular' });
        return;
      }

      const payload = {
        fullName: values.fullName.trim(),
        dni: values.dni.trim(),
        phoneNumber: `${countryCode}${nationalNumber}`,
        email: values.email.trim(),
      };

      const response = await fetch('/api/wallet-signups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        setValues(INITIAL_VALUES);
        setSuccessState(result.created ? 'created' : 'updated');
        setFieldErrors({});
        setGeneralError(null);
        setMessageStatus(result.messageStatus ?? null);
        return;
      }

      if (response.status === 400) {
        const data = (await response.json().catch(() => null)) as { issues?: Record<string, string[]>; error?: string } | null;
        if (data?.issues) {
          const formatted: FieldErrors = {};
          for (const [field, messages] of Object.entries(data.issues)) {
            const key = field as keyof FormValues;
            if (
              messages &&
              messages.length > 0 &&
              (key === 'fullName' || key === 'dni' || key === 'phoneNumber' || key === 'email')
            ) {
              formatted[key] = messages[0];
            }
          }
          setFieldErrors(formatted);
        } else {
          setGeneralError(data?.error ?? 'No pudimos validar tus datos. Intenta nuevamente.');
        }
        return;
      }

      setGeneralError('Ocurrió un problema inesperado. Intenta nuevamente en unos minutos.');
    } catch (error) {
      console.error('Wallet signup submit error', error);
      setGeneralError('Ocurrió un problema al enviar el formulario. Verifica tu conexión.');
    } finally {
      setSubmitting(false);
    }
  }

  const handleRestart = () => {
    setSuccessState(null);
    setValues(INITIAL_VALUES);
    setFieldErrors({});
    setGeneralError(null);
    setMessageStatus(null);
  };

  if (successState) {
    return <WalletSignupConfirmation variant={successState} messageStatus={messageStatus} onRestart={handleRestart} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
          Nombre completo
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          value={values.fullName}
          onChange={handleChange('fullName')}
          aria-invalid={fieldErrors.fullName ? 'true' : 'false'}
          aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
          className="w-full rounded-md border border-white/15 bg-black/40 px-4 py-3 text-base text-white placeholder:text-gray-500 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder="Ej. Daniela Quispe"
          required
        />
        {fieldErrors.fullName && (
          <p id="fullName-error" className="text-sm text-red-400">
            {fieldErrors.fullName}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="dni" className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
          DNI
        </label>
        <input
          id="dni"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={values.dni}
          onChange={(event) => {
            const numeric = event.target.value.replace(/[^\d]/g, '').slice(0, 12);
            setValues((prev) => ({ ...prev, dni: numeric }));
          }}
          aria-invalid={fieldErrors.dni ? 'true' : 'false'}
          aria-describedby={fieldErrors.dni ? 'dni-error' : undefined}
          className="w-full rounded-md border border-white/15 bg-black/40 px-4 py-3 text-base text-white placeholder:text-gray-500 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder="Ej. 12345678"
          required
        />
        <p className="text-xs text-gray-500">Usaremos tu DNI para validar tu identidad y beneficios.</p>
        {fieldErrors.dni && (
          <p id="dni-error" className="text-sm text-red-400">
            {fieldErrors.dni}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phoneNumber" className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
          Número de celular
        </label>
        <div className="flex gap-3">
          <div className="flex min-w-[140px] items-center justify-center rounded-md border border-white/15 bg-black/40 px-3 text-sm font-semibold uppercase tracking-[0.12em] text-white">
            {countryLabel}
          </div>
          <input
            id="phoneNumber"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phoneNumber}
            onChange={(event) => {
              const numeric = event.target.value.replace(/[^\d\s-]/g, '');
              setValues((prev) => ({ ...prev, phoneNumber: numeric }));
            }}
            aria-invalid={fieldErrors.phoneNumber ? 'true' : 'false'}
            aria-describedby={fieldErrors.phoneNumber ? 'phoneNumber-error' : undefined}
            className="w-full rounded-md border border-white/15 bg-black/40 px-4 py-3 text-base text-white placeholder:text-gray-500 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder="987654321"
            required
          />
        </div>
        <p className="text-xs text-gray-500">Usaremos tu número para enviarte actualizaciones por WhatsApp.</p>
        {fieldErrors.phoneNumber && (
          <p id="phoneNumber-error" className="text-sm text-red-400">
            {fieldErrors.phoneNumber}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-300">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange('email')}
          aria-invalid={fieldErrors.email ? 'true' : 'false'}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          className="w-full rounded-md border border-white/15 bg-black/40 px-4 py-3 text-base text-white placeholder:text-gray-500 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder="Ej. hola@infiltragos.com"
          required
        />
        {fieldErrors.email && (
          <p id="email-error" className="text-sm text-red-400">
            {fieldErrors.email}
          </p>
        )}
      </div>

      {generalError && (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {generalError}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center rounded-md bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? 'Guardando…' : 'Registrar'}
      </button>

      <p className="text-xs text-gray-500">
        Al registrar tus datos aceptas que te enviemos mensajes transaccionales por WhatsApp (wallet, OTP y beneficios) y correos con novedades del club.
      </p>
    </form>
  );
}
