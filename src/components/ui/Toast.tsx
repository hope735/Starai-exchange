import { create } from 'zustand';
import { useEffect } from 'react';
import { generateId } from '../../lib/crypto';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  items: ToastItem[];
  push: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (message, variant = 'info') => {
    const id = generateId('tst');
    set((s) => ({ items: [...s.items, { id, message, variant }] }));
    setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, 3500);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export function toast(message: string, variant: ToastVariant = 'info') {
  useToastStore.getState().push(message, variant);
}

const COLORS: Record<ToastVariant, string> = {
  success: 'bg-up text-white',
  error: 'bg-down text-white',
  info: 'bg-bg-tertiary text-text-primary border border-border',
  warning: 'bg-brand-gold text-bg-primary',
};

export default function ToastHost() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => undefined, []);
  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`text-left rounded-md shadow-panel px-4 py-2 text-sm font-medium ${COLORS[t.variant]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
