import WalletAddGuide from '@/modules/wallet/components/WalletAddGuide';

export default function WalletAddPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-4xl px-5 py-16 md:px-8">
        <WalletAddGuide context="page" />
      </div>
    </main>
  );
}
