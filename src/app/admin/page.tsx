import Link from 'next/link';

export default function AdminPage() {
  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <ul className="list-disc pl-5 space-y-2">
        <li><Link href="/dj/admin" className="text-blue-500 underline">DJ Module</Link></li>
        <li><Link href="/survey" className="text-blue-500 underline">Survey Module</Link></li>
      </ul>
    </main>
  );
}
