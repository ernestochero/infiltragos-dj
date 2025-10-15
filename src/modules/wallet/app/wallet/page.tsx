import WalletSignupForm from '@/modules/wallet/components/WalletSignupForm';

export default function WalletSignupPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-16 md:px-8">
        <header className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-500">Infiltragos Wallet</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Activa tu wallet digital</h1>
          <p className="mx-auto max-w-xl text-base text-gray-400">
            Cuéntanos quién eres y cómo contactarte. Al terminar recibirás un WhatsApp para añadir tu wallet a Apple/Google Wallet.
          </p>
        </header>
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-8 shadow-[0_20px_60px_-40px_rgba(255,255,255,0.4)] backdrop-blur md:p-10 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Datos para tu wallet</h2>
            <p className="text-sm text-gray-400">Completarlo toma menos de un minuto y nos ayuda a personalizar tu experiencia.</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-500">
              <li>Recibirás un WhatsApp con dos botones: añadir tu wallet y abrir tu portal.</li>
              <li>Desde el portal podrás generar códigos OTP cada vez que quieras ingresar.</li>
              <li>Si no llega en 2 minutos, avisa al staff para reenviarlo.</li>
            </ul>
          </div>
          <WalletSignupForm />
        </section>
      </div>
    </main>
  );
}
