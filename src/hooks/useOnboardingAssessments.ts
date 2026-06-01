import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OnboardingAssessmentStatus {
  disc: {
    session_id: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    result?: {
      primary_profile: string;
      secondary_profile: string | null;
      intensity: string;
      d_normalized: number;
      i_normalized: number;
      s_normalized: number;
      c_normalized: number;
    };
  };
  qa: {
    session_id: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    result?: {
      profile: string;
      profile_level: string;
      qa_total: number;
      c_score: number;
      r_score: number;
      a_score: number;
      d_score: number;
    };
  };
}

export function useOnboardingAssessments(processId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch assessment status for this onboarding process
  const { data: assessmentStatus, isLoading, refetch } = useQuery({
    queryKey: ['onboarding-assessments', processId],
    queryFn: async (): Promise<OnboardingAssessmentStatus> => {
      if (!processId) {
        return {
          disc: { session_id: null, status: 'pending' },
          qa: { session_id: null, status: 'pending' }
        };
      }

      // Fetch DISC session
      const { data: discSession } = await supabase
        .from('disc_sessions')
        .select(`
          id, status,
          disc_results(
            primary_profile, secondary_profile, intensity,
            d_normalized, i_normalized, s_normalized, c_normalized
          )
        `)
        .eq('onboarding_process_id', processId)
        .maybeSingle();

      // Fetch QA session
      const { data: qaSession } = await supabase
        .from('qa_sessions')
        .select(`
          id, status,
          qa_results(
            profile, profile_level, qa_total,
            c_score, r_score, a_score, d_score
          )
        `)
        .eq('onboarding_process_id', processId)
        .maybeSingle();

      const discResult = discSession?.disc_results?.[0];
      const qaResult = qaSession?.qa_results?.[0];

      return {
        disc: {
          session_id: discSession?.id || null,
          status: (discSession?.status as 'pending' | 'in_progress' | 'completed') || 'pending',
          result: discResult ? {
            primary_profile: discResult.primary_profile,
            secondary_profile: discResult.secondary_profile,
            intensity: discResult.intensity,
            d_normalized: discResult.d_normalized,
            i_normalized: discResult.i_normalized,
            s_normalized: discResult.s_normalized,
            c_normalized: discResult.c_normalized,
          } : undefined
        },
        qa: {
          session_id: qaSession?.id || null,
          status: (qaSession?.status as 'pending' | 'in_progress' | 'completed') || 'pending',
          result: qaResult ? {
            profile: qaResult.profile,
            profile_level: qaResult.profile_level,
            qa_total: qaResult.qa_total,
            c_score: qaResult.c_score,
            r_score: qaResult.r_score,
            a_score: qaResult.a_score,
            d_score: qaResult.d_score,
          } : undefined
        }
      };
    },
    enabled: !!processId
  });

  // Create DISC session for onboarding
  const createDISCSession = useMutation({
    mutationFn: async (data: { 
      participantName: string; 
      participantEmail?: string;
      teamId?: string;
    }) => {
      if (!user?.id || !processId) throw new Error('Dados incompletos');

      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (!profile?.account_id) throw new Error('Conta não encontrada');

      const { data: session, error } = await supabase
        .from('disc_sessions')
        .insert({
          account_id: profile.account_id,
          user_id: user.id,
          participant_name: data.participantName,
          participant_email: data.participantEmail || null,
          team_id: data.teamId || null,
          onboarding_process_id: processId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-assessments', processId] });
      toast.success('Assessment DISC criado!');
    },
    onError: (error) => {
      toast.error('Erro ao criar DISC: ' + error.message);
    }
  });

  // Create QA session for onboarding
  const createQASession = useMutation({
    mutationFn: async (data: { 
      participantName: string; 
      participantEmail?: string;
      teamId?: string;
    }) => {
      if (!user?.id || !processId) throw new Error('Dados incompletos');

      // Get user's account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (!profile?.account_id) throw new Error('Conta não encontrada');

      const { data: session, error } = await supabase
        .from('qa_sessions')
        .insert({
          account_id: profile.account_id,
          user_id: user.id,
          participant_name: data.participantName,
          participant_email: data.participantEmail || null,
          team_id: data.teamId || null,
          onboarding_process_id: processId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-assessments', processId] });
      toast.success('Assessment QA criado!');
    },
    onError: (error) => {
      toast.error('Erro ao criar QA: ' + error.message);
    }
  });

  // Auto-complete assessment task when session is completed
  const autoCompleteAssessmentTask = useMutation({
    mutationFn: async (data: { assessmentType: 'disc' | 'qa'; sessionId: string }) => {
      if (!processId) throw new Error('Process ID não informado');

      // Find the task linked to this assessment
      const { data: tasks, error: fetchError } = await supabase
        .from('onboarding_tasks')
        .select('id')
        .eq('linked_assessment_type', data.assessmentType)
        .eq('linked_assessment_id', data.sessionId);

      if (fetchError) throw fetchError;
      if (!tasks?.length) return null;

      // Mark tasks as completed
      const { error: updateError } = await supabase
        .from('onboarding_tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .in('id', tasks.map(t => t.id));

      if (updateError) throw updateError;
      return tasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-process'] });
    }
  });

  return {
    assessmentStatus: assessmentStatus || {
      disc: { session_id: null, status: 'pending' as const },
      qa: { session_id: null, status: 'pending' as const }
    },
    isLoading,
    refetch,
    createDISCSession,
    createQASession,
    autoCompleteAssessmentTask
  };
}
