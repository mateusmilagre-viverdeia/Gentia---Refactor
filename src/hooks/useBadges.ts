import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import type { Badge, UserBadge } from '@/types/gamification.types';

interface UseBadgesReturn {
  allBadges: Badge[];
  earnedBadges: UserBadge[];
  unviewedBadges: UserBadge[];
  isLoading: boolean;
  getBadgesByCategory: (category: string) => Badge[];
  hasBadge: (badgeId: string) => boolean;
  markAsSeen: (badgeId: string) => Promise<void>;
  markAllAsSeen: () => Promise<void>;
  grantBadge: (badgeId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useBadges(): UseBadgesReturn {
  const { account } = useAccount();
  const { user } = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use impersonated user's ID when impersonating for READING badges
  const effectiveUserId = isImpersonating ? impersonatedUser?.id : user?.id;

  const fetchBadges = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch all available badges
      const { data: badges, error: badgesError } = await supabase
        .from('badges')
        .select('*')
        .order('tier', { ascending: true })
        .order('points', { ascending: true });

      if (badgesError) throw badgesError;

      const mappedBadges: Badge[] = (badges || []).map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: b.category,
        tier: b.tier as Badge['tier'],
        points: b.points,
        requirement: b.requirement as Record<string, unknown> | null,
        created_at: b.created_at,
      }));
      setAllBadges(mappedBadges);

      // Fetch earned badges using effective user ID (respects impersonation)
      if (effectiveUserId) {
        const { data: earned, error: earnedError } = await supabase
          .from('user_badges')
          .select('*, badge:badges(*)')
          .eq('user_id', effectiveUserId)
          .order('earned_at', { ascending: false });

        if (earnedError) throw earnedError;

        const mappedEarned: UserBadge[] = (earned || []).map(e => {
          const badgeData = e.badge as unknown as Badge | null;
          return {
            id: e.id,
            user_id: e.account_id,
            badge_id: e.badge_id,
            earned_at: e.earned_at,
            badge: badgeData ? {
              ...badgeData,
              tier: badgeData.tier as Badge['tier'],
              requirement: badgeData.requirement as Record<string, unknown> | null,
            } : undefined,
          };
        });
        setEarnedBadges(mappedEarned);
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const unviewedBadges = earnedBadges.filter(b => {
    // Check if badge was earned in the last 24 hours (as "unviewed" proxy)
    const earnedAt = new Date(b.earned_at || '');
    const now = new Date();
    const hoursSinceEarned = (now.getTime() - earnedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceEarned < 24;
  });

  const getBadgesByCategory = (category: string) => {
    return allBadges.filter(b => b.category === category);
  };

  const hasBadge = (badgeId: string) => {
    return earnedBadges.some(b => b.badge_id === badgeId);
  };

  const markAsSeen = async (badgeId: string) => {
    // For now, this is a no-op since we use time-based "seen" logic
    // Could be extended to use a separate seen_at column
  };

  const markAllAsSeen = async () => {
    // For now, this is a no-op
  };

  const grantBadge = async (badgeId: string) => {
    if (!user?.id || !account?.id || hasBadge(badgeId)) return;

    const { data, error } = await supabase
      .from('user_badges')
      .insert({
        user_id: user.id,
        account_id: account.id,
        badge_id: badgeId,
      })
      .select('*, badge:badges(*)')
      .single();

    if (!error && data) {
      const badgeData = data.badge as unknown as Badge | null;
      const newBadge: UserBadge = {
        id: data.id,
        user_id: data.account_id,
        badge_id: data.badge_id,
        earned_at: data.earned_at,
        badge: badgeData ? {
          ...badgeData,
          tier: badgeData.tier as Badge['tier'],
          requirement: badgeData.requirement as Record<string, unknown> | null,
        } : undefined,
      };
      setEarnedBadges(prev => [newBadge, ...prev]);

      // Update badges_earned count in stats
      await supabase
        .from('company_gamification_stats')
        .update({ badges_earned: earnedBadges.length + 1 })
        .eq('account_id', account.id);
    }
  };

  return {
    allBadges,
    earnedBadges,
    unviewedBadges,
    isLoading,
    getBadgesByCategory,
    hasBadge,
    markAsSeen,
    markAllAsSeen,
    grantBadge,
    refetch: fetchBadges,
  };
}
