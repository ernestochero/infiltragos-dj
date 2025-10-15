"use client";

type Props = {
  variant: 'created' | 'updated';
  messageStatus?: { status: string; reason?: string } | null;
  onRestart: () => void;
};

export default function WalletSignupConfirmation({ variant, messageStatus, onRestart }: Props) {
  const headline =
    variant === 'created'
      ? '¡Gracias! Estamos activando tu wallet'
      : 'Datos actualizados. Revisa tu WhatsApp';

  const subHeadline =
    variant === 'created'
      ? 'En unos segundos recibirás un mensaje de Infiltragos con dos botones:'
      : 'Acabamos de reenviar el mensaje con los botones para añadir tu wallet y solicitar tu código OTP.';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-6 py-5 text-emerald-100 shadow-lg">
        <h3 className="text-lg font-semibold uppercase tracking-[0.2em] text-emerald-200">{headline}</h3>
        <p className="mt-2 text-sm text-emerald-100/80">{subHeadline}</p>
        <ul className="mt-4 space-y-2 text-sm text-emerald-100/90">
          <li>• <span className="font-semibold">Añadir a mi Wallet</span>: abre el paso para Apple/Google Wallet.</li>
          <li>• <span className="font-semibold">Ver mi perfil</span>: solicita un OTP y entra a tu panel.</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/50 px-6 py-6">
        <h4 className="text-base font-semibold text-white">¿Qué hago si no llega el mensaje?</h4>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-300">
          <li>Verifica que el número ingresado sea el correcto (+51 seguido de tu celular).</li>
          <li>Revisa que tengas señal y que WhatsApp esté funcionando.</li>
          <li>Si en 2 minutos no llega, avisa al staff en barra para reenviar el template.</li>
        </ol>
        <p className="mt-4 text-sm text-gray-400">
          Tus datos ya quedaron guardados, así que solo debemos reenviar el mensaje en caso de que no lo recibas.
        </p>
        {messageStatus && messageStatus.status !== 'sent' && (
          <p className="mt-3 rounded-md border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-xs text-yellow-200">
            Nota: {messageStatus.status === 'skipped'
              ? 'El envío automático quedó pendiente.'
              : 'No pudimos confirmar el envío automático.'}{' '}
            {messageStatus.reason ? `Detalle: ${messageStatus.reason}.` : 'Consulta al staff para reenviarlo manualmente.'}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="w-full rounded-md border border-white/20 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
      >
        Registrar a otra persona
      </button>
    </div>
  );
}
