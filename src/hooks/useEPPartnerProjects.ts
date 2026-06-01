import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { ClientProjectWithProgress, EPConsultant, ConsultantAssignment } from '@/types/consultant.types';

interface UseEPPartnerProjectsReturn {
  projects: ClientProjectWithProgress[];
  consultants: EPConsultant[];
  loading: boolean;
  error: string | null;
  getProjectConsultants: (accountId: string) => EPConsultant[];
  refresh: () => Promise<void>;
}

export function useEPPartnerProjects(): UseEPPartnerProjectsReturn {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ClientProjectWithProgress[]>([]);
  const [consultants, setConsultants] = useState<EPConsultant[]>([]);
  const [assignments, setAssignments] = useState<ConsultantAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // First, get the partner for this user
      const { data: partner, error: partnerError } = await supabase
        .from('ep_partners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Also check if user is part of a partner via ep_partner_users
      let partnerId = partner?.id;
      
      if (!partnerId) {
        const { data: partnerUser, error: partnerUserError } = await supabase
          .from('ep_partner_users')
          .select('partner_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        partnerId = partnerUser?.partner_id;
      }

      if (!partnerId) {
        setLoading(false);
        return;
      }

      // Get all active client grants for this partner
      const { data: grants, error: grantsError } = await supabase
        .from('partner_client_grants')
        .select('org_id')
        .eq('partner_id', partnerId)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString());

      if (grantsError) throw grantsError;

      const orgIds = (grants || []).map(g => g.org_id).filter(Boolean) as string[];

      if (orgIds.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      // Get all consultants that might be assigned to these projects
      const { data: allConsultants, error: consultantsError } = await supabase
        .from('ep_consultants')
        .select('*')
        .order('name');

      if (consultantsError) throw consultantsError;
      setConsultants(allConsultants || []);

      // Get all assignments for these organizations
      const { data: allAssignments, error: assignmentsError } = await supabase
        .from('consultant_assignments')
        .select('*')
        .in('account_id', orgIds)
        .eq('active', true);

      if (assignmentsError) throw assignmentsError;
      setAssignments(allAssignments || []);

      // Get all companies for these grants
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, slug, created_at')
        .in('id', orgIds)
        .order('created_at', { ascending: false });

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

          // Get assigned consultants for this project
          const projectAssignments = (allAssignments || []).filter(a => a.account_id === company.id);
          const projectConsultants = (allConsultants || []).filter(c => 
            projectAssignments.some(a => a.consultant_id === c.id)
          );

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
            consultants: projectConsultants,
          };
        })
      );

      setProjects(projectsWithProgress);
    } catch (err) {
      console.error('Error loading EP Partner projects:', err);
      setError('Erro ao carregar dados dos projetos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getProjectConsultants = (accountId: string): EPConsultant[] => {
    const projectAssignments = assignments.filter(a => a.account_id === accountId && a.active);
    return consultants.filter(c => 
      projectAssignments.some(a => a.consultant_id === c.id)
    );
  };

  return {
    projects,
    consultants,
    loading,
    error,
    getProjectConsultants,
    refresh: loadData,
  };
}
