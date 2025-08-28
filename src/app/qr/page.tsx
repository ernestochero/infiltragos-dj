import Image from 'next/image';
import QRCode from 'qrcode';

export default async function QRPage() {
  const url = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const qr = await QRCode.toDataURL(url);
  return (
    <main className="flex flex-col items-center justify-center h-screen gap-4">
      <Image src={qr} alt="QR" width={256} height={256} className="w-64 h-64" />
      <p>Escanea para pedir tu canción</p>
    </main>
  );
}
