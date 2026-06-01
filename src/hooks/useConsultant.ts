import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { supabase } from '@/integrations/supabase/client';
import type { ClientProjectWithProgress, EPConsultant, ConsultantAssignment } from '@/types/consultant.types';

interface UseConsultantReturn {
  consultant: EPConsultant | null;
  assignedProjects: ClientProjectWithProgress[];
  loading: boolean;
  error: string | null;
  reloadProjects: () => Promise<void>;
}

export function useConsultant(): UseConsultantReturn {
  const { user } = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const [consultant, setConsultant] = useState<EPConsultant | null>(null);
  const [assignedProjects, setAssignedProjects] = useState<ClientProjectWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use impersonated user's ID when impersonating, otherwise use real user's ID
  const effectiveUserId = isImpersonating ? impersonatedUser?.id : user?.id;

  const loadConsultantData = useCallback(async () => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Get consultant profile using effective user ID
      const { data: consultantData, error: consultantError } = await supabase
        .from('ep_consultants')
        .select('*')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (consultantError) throw consultantError;
      
      setConsultant(consultantData);

      if (!consultantData) {
        setAssignedProjects([]);
        setLoading(false);
        return;
      }

      // Get assigned accounts
      const { data: assignments, error: assignmentsError } = await supabase
        .from('consultant_assignments')
        .select(`
          id,
          account_id,
          active
        `)
        .eq('consultant_id', consultantData.id)
        .eq('active', true);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        setAssignedProjects([]);
        setLoading(false);
        return;
      }

      const accountIds = assignments.map(a => a.account_id);

      // Get companies with progress data
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, slug, created_at')
        .in('id', accountIds);

      if (companiesError) throw companiesError;

      // Get progress data for each company
      const projectsWithProgress: ClientProjectWithProgress[] = await Promise.all(
        (companies || []).map(async (company) => {
          // Get mission stage
          const { data: mission } = await supabase
            .from('mission_sessions')
            .select('stage')
            .eq('account_id', company.id)
            .maybeSingle();

          // Get vision stage
          const { data: vision } = await supabase
            .from('vision_sessions')
            .select('stage')
            .eq('account_id', company.id)
            .maybeSingle();

          // Get values stage
          const { data: values } = await supabase
            .from('values_sessions')
            .select('stage')
            .eq('account_id', company.id)
            .maybeSingle();

          // Get indicators stage
          const { data: indicators } = await supabase
            .from('strategic_indicators')
            .select('stage')
            .eq('account_id', company.id)
            .maybeSingle();

          // Get decision stage
          const { data: decision } = await supabase
            .from('decision_sessions')
            .select('stage')
            .eq('account_id', company.id)
            .maybeSingle();

          // Get energy stage
          const { data: energy } = await supabase
            .from('energy_sessions')
            .select('stage')
            .eq('account_id', company.id)
            .maybeSingle();

          // Get development stage
          const { data: development } = await supabase
            .from('development_sessions')
            .select('stage')
            .eq('account_id', company.id)
            .maybeSingle();

          // Get event stage
          const { data: event } = await supabase
            .from('event_sessions')
            .select('stage')
            .eq('account_id', company.id)
            .maybeSingle();

          // Get ritual stage
          const { data: ritual } = await supabase
            .from('ritual_sessions')
            .select('stage')
            .eq('account_id', company.id)
            .maybeSingle();

          // Get pending actions count
          const { count: pendingCount } = await supabase
            .from('checkpoint_actions')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', company.id)
            .eq('status', 'pending');

          // Get next checkpoint
          const { data: nextCheckpointRaw } = await supabase
            .from('project_checkpoints')
            .select('*')
            .eq('account_id', company.id)
            .eq('status', 'scheduled')
            .gte('checkpoint_date', new Date().toISOString().split('T')[0])
            .order('checkpoint_date', { ascending: true })
            .limit(1)
            .maybeSingle();

          const nextCheckpoint = nextCheckpointRaw 
            ? { ...nextCheckpointRaw, status: nextCheckpointRaw.status as 'scheduled' | 'completed' | 'cancelled' }
            : undefined;

          return {
            ...company,
            mission_stage: mission?.stage ?? null,
            vision_stage: vision?.stage ?? null,
            values_stage: values?.stage ?? null,
            indicators_stage: indicators?.stage ?? null,
            decision_stage: decision?.stage ?? null,
            energy_stage: energy?.stage ?? null,
            development_stage: development?.stage ?? null,
            event_stage: event?.stage ?? null,
            ritual_stage: ritual?.stage ?? null,
            pending_actions_count: pendingCount ?? 0,
            next_checkpoint: nextCheckpoint,
          };
        })
      );

      setAssignedProjects(projectsWithProgress);
    } catch (err) {
      console.error('Error loading consultant data:', err);
      setError('Erro ao carregar dados do consultor');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    loadConsultantData();
  }, [loadConsultantData]);

  return {
    consultant,
    assignedProjects,
    loading,
    error,
    reloadProjects: loadConsultantData,
  };
}
