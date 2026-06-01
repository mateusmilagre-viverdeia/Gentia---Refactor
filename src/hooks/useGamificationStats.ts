import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { GamificationStats } from '@/types/gamification.types';

interface UseGamificationStatsReturn {
  stats: GamificationStats | null;
  isLoading: boolean;
  level: number;
  totalPoints: number;
  badgesEarned: number;
  streakDays: number;
  progressToNextLevel: number;
  pointsToNextLevel: number;
  addPoints: (points: number) => Promise<void>;
  updateStreak: () => Promise<void>;
  refetch: () => Promise<void>;
}

const POINTS_PER_LEVEL = 1000;

async function fetchGamificationStats(accountId: string): Promise<GamificationStats> {
  const { data, error } = await supabase
    .from('company_gamification_stats')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return data as GamificationStats;
  }

  // Create initial stats if not exists
  const { data: newStats, error: insertError } = await supabase
    .from('company_gamification_stats')
    .insert({ account_id: accountId })
    .select()
    .single();

  if (insertError) throw insertError;
  return newStats as GamificationStats;
}

export function useGamificationStats(): UseGamificationStatsReturn {
  // Use OrganizationContext (global, doesn't reset on navigation) instead of useAccount
  const { currentAccount, loading: orgLoading } = useOrganization();
  const accountId = currentAccount?.id;
  const queryClient = useQueryClient();

  const { data: stats, isLoading: queryLoading } = useQuery({
    queryKey: ['gamification-stats', accountId],
    queryFn: () => fetchGamificationStats(accountId!),
    enabled: !!accountId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  // Only show loading on initial fetch when org context is still loading or no data yet
  const isLoading = (orgLoading || queryLoading) && !stats;

  const totalPoints = stats?.total_points || 0;
  const level = Math.floor(totalPoints / POINTS_PER_LEVEL) + 1;
  const pointsInCurrentLevel = totalPoints % POINTS_PER_LEVEL;
  const progressToNextLevel = (pointsInCurrentLevel / POINTS_PER_LEVEL) * 100;
  const pointsToNextLevel = POINTS_PER_LEVEL - pointsInCurrentLevel;

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['gamification-stats', accountId] });
  }, [queryClient, accountId]);

  const addPoints = async (points: number) => {
    if (!accountId || !stats) return;

    const newTotal = (stats.total_points || 0) + points;

    const { error } = await supabase
      .from('company_gamification_stats')
      .update({ total_points: newTotal })
      .eq('account_id', accountId);

    if (!error) {
      // Optimistic update
      queryClient.setQueryData(['gamification-stats', accountId], (old: GamificationStats | undefined) => 
        old ? { ...old, total_points: newTotal } : old
      );
    }
  };

  const updateStreak = async () => {
    if (!accountId || !stats) return;

    const today = new Date().toISOString().split('T')[0];
    const lastActivity = stats.last_activity_date?.split('T')[0];

    let newStreakDays = stats.streak_days || 0;

    if (!lastActivity) {
      newStreakDays = 1;
    } else if (lastActivity === today) {
      return; // Already updated today
    } else {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastActivity === yesterday) {
        newStreakDays = (stats.streak_days || 0) + 1;
      } else {
        newStreakDays = 1; // Streak broken
      }
    }

    const { error } = await supabase
      .from('company_gamification_stats')
      .update({ 
        streak_days: newStreakDays, 
        last_activity_date: today 
      })
      .eq('account_id', accountId);

    if (!error) {
      // Optimistic update
      queryClient.setQueryData(['gamification-stats', accountId], (old: GamificationStats | undefined) => 
        old ? { ...old, streak_days: newStreakDays, last_activity_date: today } : old
      );
    }
  };

  return {
    stats: stats ?? null,
    isLoading,
    level,
    totalPoints,
    badgesEarned: stats?.badges_earned || 0,
    streakDays: stats?.streak_days || 0,
    progressToNextLevel,
    pointsToNextLevel,
    addPoints,
    updateStreak,
    refetch,
  };
}
