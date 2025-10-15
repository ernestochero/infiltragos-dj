import Link from 'next/link';

const placeholderLink = '#';

export default function WalletAddPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-5 py-16 md:px-8">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-500">Infiltragos Wallet</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Añade tu tarjeta digital</h1>
          <p className="text-sm text-gray-400">
            Sigue estos pasos para guardar la tarjeta de Infiltragos en tu Apple Wallet o Google Wallet. Así tendrás tus puntos y beneficios a un toque.
          </p>
        </header>

        <section className="grid gap-16 md:grid-cols-2">
          <article className="space-y-5 rounded-2xl border border-white/10 bg-zinc-950/80 p-8 shadow-lg backdrop-blur">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">1</span>
              Apple Wallet
            </h2>
            <ol className="list-decimal space-y-3 pl-6 text-sm text-gray-300">
              <li>Abre este enlace desde tu iPhone.</li>
              <li>Cuando se abra la vista previa, toca <strong className="font-semibold text-white">“Añadir”</strong>.</li>
              <li>Confirma con Face ID o código y la tarjeta aparecerá en tu Apple Wallet.</li>
            </ol>
            <Link
              href={placeholderLink}
              className="flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/20"
              aria-disabled
            >
              Descargar pass (próximamente)
            </Link>
            <p className="text-xs text-gray-500">
              Próximamente podrás descargar un archivo <code>.pkpass</code> listo para Apple Wallet. Mientras tanto, guarda esta página o avisa al staff si necesitas ayuda.
            </p>
          </article>

          <article className="space-y-5 rounded-2xl border border-white/10 bg-zinc-950/80 p-8 shadow-lg backdrop-blur">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">2</span>
              Google Wallet
            </h2>
            <ol className="list-decimal space-y-3 pl-6 text-sm text-gray-300">
              <li>Abre el enlace desde tu Android (o navegador Chrome en iOS).</li>
              <li>Selecciona <strong className="font-semibold text-white">“Guardar en Google Wallet”</strong>.</li>
              <li>Confirma con tu cuenta de Google para terminar.</li>
            </ol>
            <Link
              href={placeholderLink}
              className="flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/20"
              aria-disabled
            >
              Guardar pase (próximamente)
            </Link>
            <p className="text-xs text-gray-500">
              Aún estamos conectando con Google Wallet. Usa esta guía como referencia y solicita soporte en barra si necesitas recibir el enlace por WhatsApp.
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/40 p-8 text-sm text-gray-300">
          <h3 className="text-base font-semibold text-white">¿Qué necesito para añadir la wallet?</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>El mismo número de celular con el que registraste tu wallet.</li>
            <li>Acceso a tu Apple ID (en iPhone) o a tu cuenta de Google (en Android).</li>
            <li>Conexión a internet para descargar la tarjeta digital.</li>
          </ul>
          <p className="mt-4 text-xs text-gray-500">
            Más adelante validaremos tu sesión automáticamente usando OTP. Por ahora solo necesitas abrir este enlace desde tu dispositivo móvil y seguir los pasos.
          </p>
        </section>
      </div>
    </main>
  );
}
