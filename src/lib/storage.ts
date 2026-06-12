// Strongly typed wrapper around localStorage with JSON serialization.
// All operations are best-effort: if the browser throws (storage disabled,
// quota exceeded, JSON corruption) we fall back to the in-memory default
// instead of crashing the entire app.

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      if (typeof localStorage === 'undefined') return fallback;
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      // Corrupt JSON — drop the bad entry and fall back to the default so
      // the app can still boot.
      try { localStorage.removeItem(key); } catch { /* noop */ }
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota or serialization issues are silently ignored
    }
  },
  remove(key: string): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};

export const STORAGE_KEYS = {
  users: 'starai:users',
  session: 'starai:session',
  orders: 'starai:orders',
  balances: 'starai:balances',
  watchlist: 'starai:watchlist',
  alerts: 'starai:alerts',
  preferences: 'starai:preferences',
  transactions: 'starai:transactions',
  kyc: 'starai:kyc',
} as const;
