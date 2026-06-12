// Trading store: per-user balances, order history and the order placement
// engine. Persists to localStorage. Order matching is a market/limit fill
// against the latest live price.
//
// Per-user account is split into three buckets:
//   balances  — funds that are free to trade / withdraw
//   holdings  — funds locked in open orders / reserved by the system
//   bonuses   — promotional credits (welcome bonus, referral, etc.)

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../lib/crypto';
import type { Order, OrderSide, OrderType } from '../types';
import { useAuthStore } from './authStore';
import { useTransactionStore } from './transactionStore';

export type Balances = Record<string, number>;

export const WELCOME_BONUS_USDT = 100;

const DEFAULT_BALANCES: Balances = {
  USDT: 0, BTC: 0, ETH: 0, SOL: 0, BNB: 0, USDC: 0,
};

const DEFAULT_BONUS: Balances = {
  USDT: WELCOME_BONUS_USDT,
};

function seedBalances(): Record<string, Balances> {
  return { default: { ...DEFAULT_BALANCES } };
}

function seedBonuses(): Record<string, Balances> {
  return { default: { ...DEFAULT_BONUS } };
}

function splitSymbol(symbol: string): { base: string; quote: string } {
  const [base, quote] = symbol.split(/[-/_]/);
  return { base: (base || '').toUpperCase(), quote: (quote || 'USDT').toUpperCase() };
}

interface TradingState {
  balances: Record<string, Balances>;
  holdings: Record<string, Balances>;
  bonuses: Record<string, Balances>;
  orders: Record<string, Order[]>;
  placeOrder: (params: {
    symbol: string;
    base: string;
    quote: string;
    side: OrderSide;
    type: OrderType;
    price: number;
    amount: number;
  }) => { ok: boolean; error?: string; order?: Order };
  cancelOrder: (orderId: string) => void;
  resetForUser: () => void;
  resetUser: (userId: string) => void;
  getOrdersFor: (userId: string) => Order[];
  getBalancesFor: (userId: string) => Balances;
  getHoldingsFor: (userId: string) => Balances;
  getBonusesFor: (userId: string) => Balances;
}

function safeStorage(): Storage {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      const m = new Map<string, string>();
      return {
        getItem: (k) => m.get(k) ?? null,
        setItem: (k, v) => { m.set(k, v); },
        removeItem: (k) => { m.delete(k); },
        clear: () => m.clear(),
        key: () => null,
        get length() { return m.size; },
      } as Storage;
    }
    window.localStorage.setItem('__probe__', '1');
    window.localStorage.removeItem('__probe__');
    return window.localStorage;
  } catch {
    const m = new Map<string, string>();
    return {
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => { m.set(k, v); },
      removeItem: (k) => { m.delete(k); },
      clear: () => m.clear(),
      key: () => null,
      get length() { return m.size; },
    } as Storage;
  }
}

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
      balances: seedBalances(),
      holdings: {},
      bonuses: seedBonuses(),
      orders: {},

      getBalancesFor(userId) {
        return get().balances[userId] ?? { USDT: 0 };
      },

      getHoldingsFor(userId) {
        return get().holdings[userId] ?? {};
      },

      getBonusesFor(userId) {
        return get().bonuses[userId] ?? {};
      },

      getOrdersFor(userId) {
        return (get().orders[userId] ?? []).slice().sort((a, b) => b.createdAt - a.createdAt);
      },

      placeOrder({ symbol, side, type, price, amount }) {
        const user = useAuthStore.getState().user;
        const userId = user?.id ?? 'default';
        const { base, quote } = splitSymbol(symbol);
        if (!base || !quote) {
          return { ok: false, error: 'Invalid trading pair' };
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          return { ok: false, error: 'Amount must be greater than 0' };
        }
        if (type === 'limit' && (!Number.isFinite(price) || price <= 0)) {
          return { ok: false, error: 'Price must be greater than 0' };
        }

        const balances = { ...(get().balances[userId] ?? { USDT: 0 }) };
        const total = amount * price;
        const fee = total * 0.001; // 0.1% taker fee

        if (side === 'buy') {
          const cost = total + fee;
          const available = balances[quote] ?? 0;
          if (available < cost) {
            return { ok: false, error: `Insufficient ${quote} balance. Need ${cost.toFixed(2)}` };
          }
          balances[quote] = available - cost;
          balances[base] = (balances[base] ?? 0) + amount;
        } else {
          const available = balances[base] ?? 0;
          if (available < amount) {
            return { ok: false, error: `Insufficient ${base} balance. Need ${amount}` };
          }
          balances[base] = available - amount;
          balances[quote] = (balances[quote] ?? 0) + total - fee;
        }

        const order: Order = {
          id: generateId('ord'),
          symbol: `${base}/${quote}`,
          side,
          type,
          price,
          amount,
          total,
          status: 'filled',
          createdAt: Date.now(),
          filledAt: Date.now(),
        };

        set((state) => ({
          balances: { ...state.balances, [userId]: balances },
          orders: {
            ...state.orders,
            [userId]: [order, ...(state.orders[userId] ?? [])],
          },
        }));

        // Record a trade transaction
        try {
          useTransactionStore.getState().addTrade(
            userId,
            side === 'buy' ? base : quote,
            side === 'buy' ? amount : total - (total * 0.001),
            total,
            `${side.toUpperCase()} ${amount.toFixed(6)} ${base} @ ${price.toFixed(2)} ${quote}`,
          );
        } catch {
          /* best-effort */
        }

        return { ok: true, order };
      },

      cancelOrder(orderId) {
        const user = useAuthStore.getState().user;
        const userId = user?.id ?? 'default';
        set((state) => ({
          orders: {
            ...state.orders,
            [userId]: (state.orders[userId] ?? []).filter((o) => o.id !== orderId),
          },
        }));
      },

      resetForUser() {
        const user = useAuthStore.getState().user;
        const userId = user?.id ?? 'default';
        set((state) => ({
          balances: { ...state.balances, [userId]: { ...DEFAULT_BALANCES } },
          bonuses: { ...state.bonuses, [userId]: { ...DEFAULT_BONUS } },
          holdings: { ...state.holdings, [userId]: {} },
          orders: { ...state.orders, [userId]: [] },
        }));
      },

      resetUser(userId) {
        set((state) => ({
          balances: { ...state.balances, [userId]: { ...DEFAULT_BALANCES } },
          bonuses: { ...state.bonuses, [userId]: { ...DEFAULT_BONUS } },
          holdings: { ...state.holdings, [userId]: {} },
          orders: { ...state.orders, [userId]: [] },
        }));
      },
    }),
    {
      name: 'starai:trading:v3',
      storage: createJSONStorage(() => safeStorage()),
      partialize: (state) => ({
        balances: state.balances,
        holdings: state.holdings,
        bonuses: state.bonuses,
        orders: state.orders,
      }),
    },
  ),
);

/** Aggregate a per-user balances map (or holdings/bonuses) into a single total. */
export function aggregate(b: Balances | undefined): number {
  if (!b) return 0;
  return Object.values(b).reduce((a, v) => a + (v || 0), 0);
}
