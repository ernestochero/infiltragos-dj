'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, children }: ModalProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const box = boxRef.current;
    const focusSelectors =
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const firstFocusable = box?.querySelector<HTMLElement>(focusSelectors);
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && box) {
        const focusables = Array.from(box.querySelectorAll<HTMLElement>(focusSelectors));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    }

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      previousActive?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fixed inset-0 bg-black/60" />
      <div className="fixed inset-0 grid place-items-center p-4">
        <div
          ref={boxRef}
          role="dialog"
          aria-modal="true"
          className="w-full max-w-md rounded-lg bg-slate-900 text-white p-4 shadow-lg"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

