import WalletOtpPortal from '@/modules/wallet/components/WalletOtpPortal';

export default function WalletPortalPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 px-5 py-16 md:px-8">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-500">Infiltragos Wallet</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Solicita tu código OTP</h1>
          <p className="text-sm text-gray-400">
            Usa el mismo número de celular con el que registraste tu wallet. Te enviaremos un código por WhatsApp para validar tu acceso.
          </p>
        </div>
        <WalletOtpPortal />
      </div>
    </main>
  );
}
