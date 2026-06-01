import { create } from 'zustand';
import type { Badge } from '@/types/gamification.types';

interface CelebrationState {
  celebratingBadge: Badge | null;
  queue: Badge[];
  seenBadgeIds: Set<string>;
  showCelebration: (badge: Badge) => void;
  dismissCelebration: () => void;
  dismissAll: () => void;
  queueBadge: (badge: Badge) => void;
  markBadgeSeen: (id: string) => void;
  getQueueLength: () => number;
}

export const useCelebration = create<CelebrationState>((set, get) => ({
  celebratingBadge: null,
  queue: [],
  seenBadgeIds: new Set(),
  
  showCelebration: (badge) => {
    set({ celebratingBadge: badge });
  },
  
  dismissCelebration: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [nextBadge, ...rest] = queue;
      set({ celebratingBadge: nextBadge, queue: rest });
    } else {
      set({ celebratingBadge: null });
    }
  },

  dismissAll: () => {
    set({ celebratingBadge: null, queue: [] });
  },
  
  queueBadge: (badge) => {
    const { celebratingBadge } = get();
    if (!celebratingBadge) {
      set({ celebratingBadge: badge });
    } else {
      set((state) => ({ queue: [...state.queue, badge] }));
    }
  },
  
  markBadgeSeen: (id) => {
    set((state) => {
      const newSet = new Set(state.seenBadgeIds);
      newSet.add(id);
      return { seenBadgeIds: newSet };
    });
  },

  getQueueLength: () => {
    const { queue, celebratingBadge } = get();
    return queue.length + (celebratingBadge ? 1 : 0);
  },
}));
