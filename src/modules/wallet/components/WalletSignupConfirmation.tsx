"use client";

type Props = {
  variant: 'created' | 'updated';
  messageStatus?: { status: string; reason?: string } | null;
  onRestart: () => void;
  onOpenWalletModal: () => void;
};

export default function WalletSignupConfirmation({ variant, messageStatus, onRestart, onOpenWalletModal }: Props) {
  const headline =
    variant === 'created'
      ? '¡Gracias! Tu wallet ya está lista'
      : 'Datos actualizados correctamente';

  const subHeadline =
    variant === 'created'
      ? 'Puedes añadirla ahora mismo desde aquí. También te enviamos un mensaje con el enlace a tu perfil para que lo tengas a mano.'
      : 'Te enviamos una confirmación por WhatsApp con acceso directo a tu perfil.';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-6 py-5 text-emerald-100 shadow-lg">
        <h3 className="text-lg font-semibold uppercase tracking-[0.2em] text-emerald-200">{headline}</h3>
        <p className="mt-2 text-sm text-emerald-100/80">{subHeadline}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/50 px-6 py-6">
        <h4 className="text-base font-semibold text-white">¿Qué hago si no llega el mensaje?</h4>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-300">
          <li>Verifica que el número ingresado sea el correcto.</li>
          <li>Revisa que tengas señal y que WhatsApp esté funcionando.</li>
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

      <div className="space-y-2">
        <button
          type="button"
          onClick={onOpenWalletModal}
          className="w-full rounded-md border border-emerald-400/60 bg-emerald-500/20 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:bg-emerald-400/30"
        >
          Añadir mi wallet ahora
        </button>
        <p className="text-xs text-gray-500 text-center">
          Se abrirá una ventana con instrucciones según tu dispositivo.
        </p>
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
