import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount';
import { useBadges } from '@/hooks/useBadges';
import type { Badge } from '@/types/gamification.types';

interface ProgressData {
  completedSteps?: string[];
  stepProgress?: Record<string, number>;
  overallProgress?: number;
  streakDays?: number;
  accessTime?: string;
  completedJourneys?: string[];
  unlockedJourneys?: string[];
  actionPlanStats?: {
    total: number;
    completed: number;
    hasPlans: boolean;
  };
  planUpdateCount?: number;
  stepCompletionDays?: Record<string, number>;
}

interface CheckAchievementsResult {
  newBadges: Badge[];
  totalChecked: number;
  alreadyEarned: number;
  completedSteps?: string[];
  completedJourneys?: string[];
  overallProgress?: number;
  stepProgress?: Record<string, number>;
  actionPlanStats?: {
    total: number;
    completed: number;
    hasPlans: boolean;
  };
}

export function useAchievementChecker() {
  const { account } = useAccount();
  const { refetch: refetchBadges } = useBadges();
  const isCheckingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Direct check without debounce - returns result
  // NOTE: This no longer calls queueBadge directly.
  // The useBadgeNotifications hook handles celebration display
  // by polling for badges where seen_at IS NULL
  const checkAchievementsNow = useCallback(async (progressData: ProgressData): Promise<CheckAchievementsResult | null> => {
    if (!account?.id) return null;

    try {
      const { data, error } = await supabase.functions.invoke('check-achievements', {
        body: {
          accountId: account.id,
          progressData,
        },
      });

      if (error) {
        console.error('Error checking achievements:', error);
        return null;
      }

      if (data?.newBadges && data.newBadges.length > 0) {
        // Just refetch badges to update the UI
        // The celebration will be handled by useBadgeNotifications
        // which polls for unseen badges (seen_at IS NULL)
        await refetchBadges();
      }

      return data as CheckAchievementsResult;
    } catch (error) {
      console.error('Error in achievement check:', error);
      return null;
    }
  }, [account?.id, refetchBadges]);

  // Debounced check - for background/automatic checks
  const checkAchievements = useCallback(async (progressData: ProgressData): Promise<CheckAchievementsResult | null> => {
    if (!account?.id || isCheckingRef.current) return null;

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    return new Promise((resolve) => {
      debounceRef.current = setTimeout(async () => {
        isCheckingRef.current = true;

        try {
          const result = await checkAchievementsNow(progressData);
          resolve(result);
        } finally {
          isCheckingRef.current = false;
        }
      }, 500); // 500ms debounce
    });
  }, [account?.id, checkAchievementsNow]);

  const checkStepCompletion = useCallback(async (stepId: string) => {
    await checkAchievements({ completedSteps: [stepId] });
  }, [checkAchievements]);

  const checkJourneyCompletion = useCallback(async (journeyId: string) => {
    await checkAchievements({ completedJourneys: [journeyId] });
  }, [checkAchievements]);

  const checkOverallProgress = useCallback(async (progress: number) => {
    await checkAchievements({ overallProgress: progress });
  }, [checkAchievements]);

  const checkStreak = useCallback(async (days: number) => {
    await checkAchievements({ streakDays: days });
  }, [checkAchievements]);

  return {
    checkAchievements,
    checkAchievementsNow, // Direct call without debounce
    checkStepCompletion,
    checkJourneyCompletion,
    checkOverallProgress,
    checkStreak,
  };
}
