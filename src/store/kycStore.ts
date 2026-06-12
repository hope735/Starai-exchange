// KYC (Know Your Customer) store. Tracks per-user identity verification
// submissions and progress. The demo simulates the typical lifecycle:
//   unverified -> pending -> verified
// with submissions that can also be rejected.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface KycSubmission {
  userId: string;
  status: KycStatus;
  fullName: string;
  dateOfBirth: string;
  country: string;
  address: string;
  documentType: 'passport' | 'id_card' | 'drivers_license';
  documentNumber: string;
  submittedAt: number;
  reviewedAt?: number;
  rejectionReason?: string;
}

interface KycState {
  submissions: Record<string, KycSubmission>;
  submit: (submission: Omit<KycSubmission, 'status' | 'submittedAt'>) => KycSubmission;
  /** Mark a pending submission as verified (used by the demo auto-approval). */
  markVerified: (userId: string) => void;
  /** Reject a pending submission with a reason. */
  reject: (userId: string, reason: string) => void;
  /** Reset the KYC state for a user. */
  resetFor: (userId: string) => void;
  getFor: (userId: string) => KycSubmission | undefined;
}

// Safe localStorage shim for environments where it's disabled or throws.
function safeStorage<T>(): Storage | undefined {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return undefined;
    // Probe: some browsers throw on the very first call if storage is full
    // or in private mode.
    const probe = '__starai_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export const useKycStore = create<KycState>()(
  persist(
    (set, get) => ({
      submissions: {},

      submit(submission) {
        const full: KycSubmission = {
          ...submission,
          status: 'pending',
          submittedAt: Date.now(),
        };
        set((state) => ({
          submissions: { ...state.submissions, [submission.userId]: full },
        }));
        return full;
      },

      markVerified(userId) {
        set((state) => {
          const current = state.submissions[userId];
          if (!current) return state;
          return {
            submissions: {
              ...state.submissions,
              [userId]: { ...current, status: 'verified' as const, reviewedAt: Date.now() },
            },
          };
        });
      },

      reject(userId, reason) {
        set((state) => {
          const current = state.submissions[userId];
          if (!current) return state;
          return {
            submissions: {
              ...state.submissions,
              [userId]: {
                ...current,
                status: 'rejected' as const,
                reviewedAt: Date.now(),
                rejectionReason: reason,
              },
            },
          };
        });
      },

      resetFor(userId) {
        set((state) => {
          const next = { ...state.submissions };
          delete next[userId];
          return { submissions: next };
        });
      },

      getFor(userId) {
        return get().submissions[userId];
      },
    }),
    {
      name: 'starai:kyc:v2',
      storage: createJSONStorage(() => safeStorage() as Storage),
      // Don't store helper functions, only data
      partialize: (state) => ({ submissions: state.submissions }),
    },
  ),
);
