// Transaction history store. Tracks deposits, withdrawals and trade
// settlements on a per-user basis. In a real product these would be
// records synced from a server; for the demo they live in localStorage.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../lib/crypto';

export type TxKind = 'deposit' | 'withdraw' | 'trade' | 'fee';
export type TxStatus = 'pending' | 'completed' | 'failed';

export interface Transaction {
  id: string;
  kind: TxKind;
  asset: string;
  amount: number;
  /** Asset value in USD at the time of the transaction, if known. */
  valueUsd?: number;
  /** Free-form note (e.g. address, network, or trade id). */
  note?: string;
  status: TxStatus;
  createdAt: number;
}

interface TransactionState {
  /** map of userId -> transaction list (newest first) */
  transactions: Record<string, Transaction[]>;
  addTransaction: (
    userId: string,
    tx: Omit<Transaction, 'id' | 'createdAt' | 'status'> & { status?: TxStatus },
  ) => Transaction;
  addDeposit: (userId: string, asset: string, amount: number, valueUsd?: number) => Transaction;
  addWithdraw: (userId: string, asset: string, amount: number, valueUsd?: number, note?: string) => Transaction;
  addTrade: (userId: string, asset: string, amount: number, valueUsd: number, note: string) => Transaction;
  getTransactionsFor: (userId: string) => Transaction[];
  clearForUser: (userId: string) => void;
}

// Safe localStorage shim for environments where it's disabled or throws.
function safeStorage<T>(): Storage | undefined {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return undefined;
    const probe = '__starai_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: {},

      addTransaction(userId, tx) {
        const full: Transaction = {
          id: generateId('tx'),
          createdAt: Date.now(),
          status: tx.status ?? 'completed',
          kind: tx.kind,
          asset: tx.asset,
          amount: tx.amount,
          valueUsd: tx.valueUsd,
          note: tx.note,
        };
        set((state) => {
          const current = state.transactions[userId] ?? [];
          return { transactions: { ...state.transactions, [userId]: [full, ...current] } };
        });
        return full;
      },

      addDeposit(userId, asset, amount, valueUsd) {
        return get().addTransaction(userId, { kind: 'deposit', asset, amount, valueUsd });
      },

      addWithdraw(userId, asset, amount, valueUsd, note) {
        return get().addTransaction(userId, { kind: 'withdraw', asset, amount, valueUsd, note });
      },

      addTrade(userId, asset, amount, valueUsd, note) {
        return get().addTransaction(userId, { kind: 'trade', asset, amount, valueUsd, note });
      },

      getTransactionsFor(userId) {
        return (get().transactions[userId] ?? []).slice().sort((a, b) => b.createdAt - a.createdAt);
      },

      clearForUser(userId) {
        set((state) => {
          const next = { ...state.transactions };
          delete next[userId];
          return { transactions: next };
        });
      },
    }),
    {
      name: 'starai:transactions:v2',
      storage: createJSONStorage(() => safeStorage() as Storage),
      partialize: (state) => ({ transactions: state.transactions }),
    },
  ),
);
