import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DailyPulseStatus {
  hasAssignment: boolean;
  assignmentId: string | null;
  questionsCount: number;
  isLoading: boolean;
  refetch: () => void;
}

export function useDailyPulseStatus(accountId: string | null): DailyPulseStatus {
  const [hasAssignment, setHasAssignment] = useState(false);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!accountId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if assignment exists for today
      const { data: assignment, error } = await supabase
        .from('pulse_daily_assignments')
        .select('id')
        .eq('account_id', accountId)
        .eq('date', today)
        .maybeSingle();

      if (error) {
        console.error('Error checking daily pulse status:', error);
        setHasAssignment(false);
        setAssignmentId(null);
        setQuestionsCount(0);
        return;
      }

      if (assignment) {
        setHasAssignment(true);
        setAssignmentId(assignment.id);

        // Get questions count
        const { count } = await supabase
          .from('pulse_daily_assignment_items')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', assignment.id);

        setQuestionsCount(count || 0);
      } else {
        setHasAssignment(false);
        setAssignmentId(null);
        setQuestionsCount(0);
      }
    } catch (error) {
      console.error('Error checking daily pulse status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    hasAssignment,
    assignmentId,
    questionsCount,
    isLoading,
    refetch: checkStatus,
  };
}
