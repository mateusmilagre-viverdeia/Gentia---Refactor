import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimeEntryCategory } from '@/types/time-tracking.types';

interface TimerState {
  isActive: boolean;
  accountId: string | null;
  accountName: string | null;
  category: TimeEntryCategory;
  startedAt: string | null; // ISO string for persistence
  description: string;
}

interface TimerActions {
  startTimer: (accountId: string, accountName: string, category: TimeEntryCategory, description?: string) => void;
  stopTimer: () => TimerState;
  updateCategory: (category: TimeEntryCategory) => void;
  updateDescription: (description: string) => void;
  reset: () => void;
  getElapsedMinutes: () => number;
}

const initialState: TimerState = {
  isActive: false,
  accountId: null,
  accountName: null,
  category: 'other',
  startedAt: null,
  description: '',
};

export const useTimerStore = create<TimerState & TimerActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      startTimer: (accountId, accountName, category, description = '') => {
        set({
          isActive: true,
          accountId,
          accountName,
          category,
          startedAt: new Date().toISOString(),
          description,
        });
      },

      stopTimer: () => {
        const state = get();
        set(initialState);
        return state;
      },

      updateCategory: (category) => {
        set({ category });
      },

      updateDescription: (description) => {
        set({ description });
      },

      reset: () => {
        set(initialState);
      },

      getElapsedMinutes: () => {
        const { startedAt, isActive } = get();
        if (!isActive || !startedAt) return 0;
        const start = new Date(startedAt);
        const now = new Date();
        return Math.floor((now.getTime() - start.getTime()) / 60000);
      },
    }),
    {
      name: 'consultant-timer',
    }
  )
);
