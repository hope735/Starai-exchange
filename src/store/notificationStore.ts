// Notification store. Per-user notification feed with categories
// (announcement, account, market, security) and read/unread state.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type NotificationCategory = 'announcement' | 'account' | 'market' | 'security' | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  link?: string;
}

interface NotificationState {
  notifications: Record<string, AppNotification[]>;
  push: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => AppNotification;
  markRead: (userId: string, id: string) => void;
  markAllRead: (userId: string) => void;
  clearAll: (userId: string) => void;
  forUser: (userId: string) => AppNotification[];
  unreadCount: (userId: string) => number;
}

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
function genId(prefix = 'ntf'): string {
  let s = '';
  for (let i = 0; i < 10; i += 1) s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  return `${prefix}_${s}`;
}

function safeStorage(): Storage {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      const memory = new Map<string, string>();
      return {
        getItem: (k) => memory.get(k) ?? null,
        setItem: (k, v) => { memory.set(k, v); },
        removeItem: (k) => { memory.delete(k); },
        clear: () => memory.clear(),
        key: () => null,
        get length() { return memory.size; },
      } as Storage;
    }
    const probe = '__starai_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => { memory.set(k, v); },
      removeItem: (k) => { memory.delete(k); },
      clear: () => memory.clear(),
      key: () => null,
      get length() { return memory.size; },
    } as Storage;
  }
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: {},

      push(n) {
        const full: AppNotification = {
          id: genId('ntf'),
          createdAt: Date.now(),
          read: false,
          userId: n.userId,
          category: n.category,
          title: n.title,
          body: n.body,
          link: n.link,
        };
        set((state) => {
          const list = state.notifications[n.userId] ?? [];
          return { notifications: { ...state.notifications, [n.userId]: [full, ...list].slice(0, 200) } };
        });
        return full;
      },

      markRead(userId, id) {
        set((state) => {
          const list = state.notifications[userId] ?? [];
          return {
            notifications: {
              ...state.notifications,
              [userId]: list.map((n) => (n.id === id ? { ...n, read: true } : n)),
            },
          };
        });
      },

      markAllRead(userId) {
        set((state) => {
          const list = state.notifications[userId] ?? [];
          return {
            notifications: {
              ...state.notifications,
              [userId]: list.map((n) => ({ ...n, read: true })),
            },
          };
        });
      },

      clearAll(userId) {
        set((state) => {
          const next = { ...state.notifications };
          delete next[userId];
          return { notifications: next };
        });
      },

      forUser(userId) {
        return (get().notifications[userId] ?? []).slice().sort((a, b) => b.createdAt - a.createdAt);
      },

      unreadCount(userId) {
        return (get().notifications[userId] ?? []).filter((n) => !n.read).length;
      },
    }),
    {
      name: 'starai:notifications:v2',
      storage: createJSONStorage(() => safeStorage()),
      partialize: (state) => ({ notifications: state.notifications }),
    },
  ),
);

/** Seed the user's notification inbox with a few welcome + market items on first login. */
export function seedDefaultNotifications(userId: string) {
  const store = useNotificationStore.getState();
  if ((store.notifications[userId] ?? []).some((n) => n.title.includes('Welcome'))) return;
  store.push({
    userId, category: 'announcement',
    title: 'Welcome to StarAI',
    body: 'Your account is ready. Set up two-factor authentication and complete KYC to unlock higher limits.',
  });
  store.push({
    userId, category: 'security',
    title: 'Secure your account',
    body: 'Enable 2FA in your profile to protect your wallet from unauthorized access.',
  });
  store.push({
    userId, category: 'account',
    title: 'Your welcome bonus is available',
    body: 'A 100 USDT sign-up bonus has been credited to your account. Trade to unlock withdrawals.',
  });
  store.push({
    userId, category: 'market',
    title: 'Bitcoin above $60K',
    body: 'BTC reclaimed the $60,000 level overnight. Check the markets page for the latest movers.',
  });
}
