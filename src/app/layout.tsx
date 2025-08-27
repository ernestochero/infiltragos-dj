import '../styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'DJ Requests' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-900 text-white">{children}</body>
    </html>
  );
}
