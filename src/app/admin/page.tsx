import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@core/api/auth';
import { redirect } from 'next/navigation';

export default function AdminPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session) redirect('/login');
  if (session.role === 'DJ') redirect('/dj/admin');

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <ul className="list-disc pl-5 space-y-2">
        <li><Link href="/dj/admin" className="text-blue-500 underline">DJ Module</Link></li>
        <li><Link href="/survey" className="text-blue-500 underline">Survey Module</Link></li>
        <li><Link href="/contest" className="text-blue-500 underline">Contest Module</Link></li>
        <li><Link href="/tickets" className="text-blue-500 underline">Ticket Module</Link></li>
      </ul>
    </main>
  );
}
