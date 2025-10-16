"use client";

import { useEffect } from 'react';
import WalletAddGuide from './WalletAddGuide';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function WalletAddModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8">
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/20"
        >
          Cerrar
        </button>
        <div className="pt-6">
          <WalletAddGuide context="modal" />
        </div>
      </div>
    </div>
  );
}
