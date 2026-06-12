// Market data store backed by the public CoinGecko API with refresh support.

import { create } from 'zustand';
import { getMarkets } from '../lib/api';
import type { Coin } from '../types';

interface MarketState {
  coins: Coin[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  fetch: (vsCurrency?: string, perPage?: number) => Promise<void>;
  startAutoRefresh: (intervalMs?: number, vsCurrency?: string) => void;
  stopAutoRefresh: () => void;
}

let refreshTimer: number | null = null;

export const useMarketStore = create<MarketState>((set, get) => ({
  coins: [],
  loading: false,
  error: null,
  lastUpdated: null,

  async fetch(vsCurrency = 'usd', perPage = 100) {
    set({ loading: true, error: null });
    try {
      const coins = await getMarkets({ vsCurrency, perPage });
      set({ coins, loading: false, lastUpdated: Date.now() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load markets';
      set({ error: msg, loading: false });
    }
  },

  startAutoRefresh(intervalMs = 60_000, vsCurrency = 'usd') {
    get().stopAutoRefresh();
    refreshTimer = window.setInterval(() => {
      get().fetch(vsCurrency).catch(() => undefined);
    }, intervalMs);
  },

  stopAutoRefresh() {
    if (refreshTimer !== null) {
      window.clearInterval(refreshTimer);
      refreshTimer = null;
    }
  },
}));
