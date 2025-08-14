'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [token, setToken] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    document.cookie = `dj_admin=${token}; path=/`;
    router.push('/admin');
  };

  return (
    <main className="p-4 max-w-sm mx-auto">
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Token"
          className="border p-2 w-full"
        />
        <button type="submit" className="bg-blue-500 text-white px-3 py-2 rounded w-full">
          Login
        </button>
      </form>
    </main>
  );
}
