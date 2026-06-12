// Auth store using Zustand. Users are stored in localStorage with hashed
// passwords. In a real product this would be a server with secure storage.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS, storage } from '../lib/storage';
import { generateId, hashPassword, generateRecoveryPhrase, deriveRecoveryPhrase } from '../lib/crypto';

import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string; recoveryPhrase?: string[] }>;
  logout: () => void;
  updateProfile: (patch: Partial<Pick<User, 'name' | 'twoFactorEnabled' | 'kycStatus' | 'phraseConfirmed'>>) => void;
  hydrate: () => void;
}


function readUsers(): User[] {
  return storage.get<User[]>(STORAGE_KEYS.users, []);
}

function writeUsers(users: User[]): void {
  storage.set(STORAGE_KEYS.users, users);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      async login(email, password) {
        set({ isLoading: true, error: null });
        try {
          // simulate latency for a more realistic feel
          await new Promise((r) => setTimeout(r, 400));
          const users = readUsers();
          const passwordHash = await hashPassword(password);
          const user = users.find(
            (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === passwordHash,
          );
          if (!user) {
            set({ isLoading: false, error: 'Invalid email or password' });
            return { ok: false, error: 'Invalid email or password' };
          }
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          storage.set(STORAGE_KEYS.session, { userId: user.id });
          return { ok: true };
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Login failed';
          set({ isLoading: false, error: msg });
          return { ok: false, error: msg };
        }
      },

      async register(name, email, password) {
        set({ isLoading: true, error: null });
        try {
          if (password.length < 6) {
            set({ isLoading: false, error: 'Password must be at least 6 characters' });
            return { ok: false, error: 'Password must be at least 6 characters' };
          }
          if (!/^\S+@\S+\.\S+$/.test(email)) {
            set({ isLoading: false, error: 'Please enter a valid email' });
            return { ok: false, error: 'Please enter a valid email' };
          }
          await new Promise((r) => setTimeout(r, 500));
          const users = readUsers();
          if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
            set({ isLoading: false, error: 'An account with this email already exists' });
            return { ok: false, error: 'An account with this email already exists' };
          }
          const passwordHash = await hashPassword(password);
          const id = generateId('usr');
          // Use a fresh cryptographically-strong phrase for every new
          // user. Every phrase contains 12 *unique* words and a
          // different seed (in this case, the user's id) yields a
          // different phrase — the user keeps it, we don't store it.
          const recoveryPhrase = generateRecoveryPhrase();

          const user: User = {
            id,
            name: name.trim(),
            email: email.trim(),
            passwordHash,
            createdAt: Date.now(),
            twoFactorEnabled: false,
            kycStatus: 'unverified',
            recoveryPhrase,
            phraseConfirmed: false,
          };
          writeUsers([...users, user]);
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          storage.set(STORAGE_KEYS.session, { userId: user.id });
          return { ok: true, recoveryPhrase };
        } catch (e) {

          const msg = e instanceof Error ? e.message : 'Registration failed';
          set({ isLoading: false, error: msg });
          return { ok: false, error: msg };
        }
      },

      logout() {
        storage.remove(STORAGE_KEYS.session);
        set({ user: null, isAuthenticated: false, error: null });
      },

      updateProfile(patch) {
        const current = get().user;
        if (!current) return;
        const updated: User = { ...current, ...patch };
        set({ user: updated });
        const users = readUsers().map((u) => (u.id === updated.id ? updated : u));
        writeUsers(users);
      },

      hydrate() {
        const session = storage.get<{ userId: string } | null>(STORAGE_KEYS.session, null);
        if (!session) return;
        const user = readUsers().find((u) => u.id === session.userId);
        if (user) {
          set({ user, isAuthenticated: true });
        } else {
          storage.remove(STORAGE_KEYS.session);
        }
      },
    }),
    {
      name: 'starai:auth:v2',
      storage: createJSONStorage(() => {
        try {
          if (typeof window === 'undefined' || !window.localStorage) return undefined as unknown as Storage;
          return window.localStorage;
        } catch {
          return undefined as unknown as Storage;
        }
      }),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
