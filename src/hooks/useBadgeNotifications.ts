import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useCelebration } from '@/hooks/useCelebration';
import type { Badge } from '@/types/gamification.types';

const POLLING_INTERVAL = 5000; // 5 seconds

export function useBadgeNotifications() {
  const { user } = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const queueBadge = useCelebration((state) => state.queueBadge);
  const markBadgeSeen = useCelebration((state) => state.markBadgeSeen);
  const seenBadgeIds = useCelebration((state) => state.seenBadgeIds);
  const isActiveRef = useRef(true);
  const isProcessingRef = useRef(false);

  // Use impersonated user's ID when impersonating
  const effectiveUserId = isImpersonating ? impersonatedUser?.id : user?.id;

  const markBadgeAsSeenInDB = useCallback(async (userBadgeId: string) => {
    try {
      await supabase
        .from('user_badges')
        .update({ seen_at: new Date().toISOString() })
        .eq('id', userBadgeId);
    } catch (error) {
      console.error('Error marking badge as seen:', error);
    }
  }, []);

  const checkNewBadges = useCallback(async () => {
    if (!isActiveRef.current || !effectiveUserId || isProcessingRef.current) return;

    isProcessingRef.current = true;

    try {
      // Only fetch badges that haven't been seen yet (seen_at IS NULL)
      const { data, error } = await supabase
        .from('user_badges')
        .select('*, badge:badges(*)')
        .eq('user_id', effectiveUserId)
        .is('seen_at', null)
        .order('earned_at', { ascending: true }) // Show oldest first
        .limit(10);

      if (error) {
        console.error('Error checking badges:', error);
        return;
      }

      if (data && data.length > 0) {
        // Process unseen badges
        for (const badgeData of data) {
          // Skip if already in local memory (being processed)
          if (seenBadgeIds.has(badgeData.id)) continue;
          
          const badge = badgeData.badge as Badge;
          if (badge) {
            // Mark as seen in local memory immediately to prevent re-processing
            markBadgeSeen(badgeData.id);
            
            // Mark as seen in database immediately to prevent re-appearance
            await markBadgeAsSeenInDB(badgeData.id);
            
            // Queue the celebration animation
            queueBadge({
              ...badge,
              tier: badge.tier as Badge['tier'],
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in badge notification check:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [effectiveUserId, queueBadge, markBadgeSeen, seenBadgeIds, markBadgeAsSeenInDB]);

  useEffect(() => {
    if (!effectiveUserId) return;

    isActiveRef.current = true;
    isProcessingRef.current = false;

    // Initial check
    checkNewBadges();

    // Set up polling
    const interval = setInterval(checkNewBadges, POLLING_INTERVAL);

    return () => {
      isActiveRef.current = false;
      clearInterval(interval);
    };
  }, [effectiveUserId, checkNewBadges]);
}
