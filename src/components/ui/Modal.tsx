// Reusable modal/dialog primitive. Closes on backdrop click, escape key,
// and an explicit close button. Renders a fixed overlay + a centered
// card with sensible default padding.

import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string; // tailwind max-w-* class
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // focus the card for keyboard users
    setTimeout(() => cardRef.current?.focus(), 30);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidth} card max-h-[90vh] overflow-y-auto focus:outline-none`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-bg-secondary">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
