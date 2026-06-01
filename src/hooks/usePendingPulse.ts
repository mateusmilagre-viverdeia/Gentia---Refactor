import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

interface PendingPulseState {
  hasPendingPulse: boolean;
  isLoading: boolean;
  assignmentId: string | null;
  questionsCount: number;
  refetch: () => void;
}

export function usePendingPulse(): PendingPulseState {
  const [state, setState] = useState<Omit<PendingPulseState, 'refetch'>>({
    hasPendingPulse: false,
    isLoading: true,
    assignmentId: null,
    questionsCount: 0,
  });
  const { currentOrganization } = useOrganization();

  const checkPendingPulse = useCallback(async () => {
    if (!currentOrganization?.id) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Get today's assignment
      const { data: assignments } = await supabase
        .from('pulse_daily_assignments')
        .select('id')
        .eq('account_id', currentOrganization.id)
        .eq('date', today)
        .limit(1);

      const assignment = assignments?.[0];

      if (!assignment) {
        setState({
          hasPendingPulse: false,
          isLoading: false,
          assignmentId: null,
          questionsCount: 0,
        });
        return;
      }

      // Get assignment items count
      const { data: items } = await supabase
        .from('pulse_daily_assignment_items')
        .select('id')
        .eq('assignment_id', assignment.id);
      
      const itemsCount = items?.length || 0;

      // Check if user has already responded - use filter to avoid deep type issues
      const { data: responses } = await supabase
        .from('pulse_responses')
        .select('id')
        .match({ assignment_id: assignment.id, user_id: user.id });
      
      const responsesCount = responses?.length || 0;

      const hasPendingPulse = responsesCount < itemsCount;

      setState({
        hasPendingPulse,
        isLoading: false,
        assignmentId: assignment.id,
        questionsCount: itemsCount - responsesCount,
      });

    } catch (error) {
      console.error('Error checking pending pulse:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    checkPendingPulse();
  }, [checkPendingPulse]);

  return { ...state, refetch: checkPendingPulse };
}
