// Live console store: keeps a rolling buffer of log lines + tracks which
// sources are currently streaming. This powers the bottom interactive panel
// that shows real-time API activity, system events and user actions.

import { create } from 'zustand';

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'api' | 'system' | 'trade' | 'user';

export interface ConsoleLog {
  id: number;
  ts: number;
  level: LogLevel;
  source: string; // e.g. "CoinGecko", "Auth", "Trading", "UI"
  message: string;
  meta?: Record<string, unknown>;
}

interface ConsoleState {
  logs: ConsoleLog[];
  nextId: number;
  paused: boolean;
  expanded: boolean;
  filter: LogLevel | 'all';
  push: (entry: Omit<ConsoleLog, 'id' | 'ts'>) => void;
  pushApi: (source: string, message: string, meta?: Record<string, unknown>) => void;
  pushTrade: (message: string, meta?: Record<string, unknown>) => void;
  pushUser: (message: string, meta?: Record<string, unknown>) => void;
  pushSystem: (message: string, meta?: Record<string, unknown>) => void;
  pushError: (source: string, message: string, meta?: Record<string, unknown>) => void;
  clear: () => void;
  togglePaused: () => void;
  setExpanded: (v: boolean) => void;
  setFilter: (f: LogLevel | 'all') => void;
}

const MAX_LOGS = 500;
let counter = 0;

export const useConsoleStore = create<ConsoleState>((set, get) => ({
  logs: [
    {
      id: ++counter,
      ts: Date.now(),
      level: 'system',
      source: 'StarAI',
      message: 'Live console online — listening to market, trading and UI events.',
    },
  ],
  nextId: counter + 1,
  paused: false,
  expanded: false,
  filter: 'all',

  push(entry) {
    if (get().paused) return;
    const id = get().nextId;
    set((state) => ({
      logs: [...state.logs, { ...entry, id, ts: Date.now() }].slice(-MAX_LOGS),
      nextId: id + 1,
    }));
  },

  pushApi(source, message, meta) {
    get().push({ level: 'api', source, message, meta });
  },

  pushTrade(message, meta) {
    get().push({ level: 'trade', source: 'TradingEngine', message, meta });
  },

  pushUser(message, meta) {
    get().push({ level: 'user', source: 'UI', message, meta });
  },

  pushSystem(message, meta) {
    get().push({ level: 'system', source: 'System', message, meta });
  },

  pushError(source, message, meta) {
    get().push({ level: 'error', source, message, meta });
  },

  clear() {
    counter = 0;
    set({
      logs: [
        {
          id: 1,
          ts: Date.now(),
          level: 'system',
          source: 'System',
          message: 'Console cleared.',
        },
      ],
      nextId: 2,
    });
  },

  togglePaused() {
    set((s) => ({ paused: !s.paused }));
  },

  setExpanded(v) {
    set({ expanded: v });
  },

  setFilter(f) {
    set({ filter: f });
  },
}));

// Convenience export for components that don't need reactivity.
export const consoleLog = {
  api: (source: string, message: string, meta?: Record<string, unknown>) =>
    useConsoleStore.getState().pushApi(source, message, meta),
  trade: (message: string, meta?: Record<string, unknown>) =>
    useConsoleStore.getState().pushTrade(message, meta),
  user: (message: string, meta?: Record<string, unknown>) =>
    useConsoleStore.getState().pushUser(message, meta),
  system: (message: string, meta?: Record<string, unknown>) =>
    useConsoleStore.getState().pushSystem(message, meta),
  error: (source: string, message: string, meta?: Record<string, unknown>) =>
    useConsoleStore.getState().pushError(source, message, meta),
};
