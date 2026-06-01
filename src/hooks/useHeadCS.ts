import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ClientProjectWithProgress, EPConsultant, ConsultantAssignment } from '@/types/consultant.types';

interface UseHeadCSReturn {
  allProjects: ClientProjectWithProgress[];
  allConsultants: EPConsultant[];
  loading: boolean;
  error: string | null;
  reloadData: () => Promise<void>;
  assignConsultant: (consultantId: string, accountId: string) => Promise<boolean>;
  unassignConsultant: (consultantId: string, accountId: string) => Promise<boolean>;
  createConsultant: (data: { user_id: string; name: string; email: string; phone?: string; role?: 'ep_consultant' | 'head_cs' }) => Promise<EPConsultant | null>;
  searchUserByEmail: (email: string) => Promise<{ id: string; name: string; email: string } | null>;
  sendEPInvite: (data: { email: string; name: string; role: 'ep_consultant' | 'head_cs' }) => Promise<boolean>;
  updateConsultant: (id: string, data: Partial<EPConsultant>) => Promise<boolean>;
  deactivateConsultant: (id: string) => Promise<boolean>;
  reactivateConsultant: (id: string) => Promise<boolean>;
  getProjectConsultants: (accountId: string) => EPConsultant[];
}

export function useHeadCS(): UseHeadCSReturn {
  const { user } = useAuth();
  const [allProjects, setAllProjects] = useState<ClientProjectWithProgress[]>([]);
  const [allConsultants, setAllConsultants] = useState<EPConsultant[]>([]);
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

      // Get all consultants
      const { data: consultants, error: consultantsError } = await supabase
        .from('ep_consultants')
        .select('*')
        .order('name');

      if (consultantsError) throw consultantsError;
      setAllConsultants(consultants || []);

      // Get all assignments
      const { data: allAssignments, error: assignmentsError } = await supabase
        .from('consultant_assignments')
        .select('*')
        .eq('active', true);

      if (assignmentsError) throw assignmentsError;
      setAssignments(allAssignments || []);

      // Get all companies
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, slug, created_at')
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
          const projectConsultants = (consultants || []).filter(c => 
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
            event_stage: null,
            ritual_stage: null,
            pending_actions_count: pendingCount ?? 0,
            next_checkpoint: nextCheckpoint,
            consultants: projectConsultants,
          };
        })
      );

      setAllProjects(projectsWithProgress);
    } catch (err) {
      console.error('Error loading Head CS data:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignConsultant = async (consultantId: string, accountId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('consultant_assignments')
        .upsert({
          consultant_id: consultantId,
          account_id: accountId,
          assigned_by: user.id,
          active: true,
        }, {
          onConflict: 'consultant_id,account_id',
        });

      if (error) throw error;

      toast.success('Consultor atribuído com sucesso');
      await loadData();
      return true;
    } catch (err) {
      console.error('Error assigning consultant:', err);
      toast.error('Erro ao atribuir consultor');
      return false;
    }
  };

  const unassignConsultant = async (consultantId: string, accountId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('consultant_assignments')
        .update({ active: false })
        .eq('consultant_id', consultantId)
        .eq('account_id', accountId);

      if (error) throw error;

      toast.success('Consultor removido do projeto');
      await loadData();
      return true;
    } catch (err) {
      console.error('Error unassigning consultant:', err);
      toast.error('Erro ao remover consultor');
      return false;
    }
  };

  const createConsultant = async (data: { user_id: string; name: string; email: string; phone?: string; role?: 'ep_consultant' | 'head_cs' }): Promise<EPConsultant | null> => {
    if (!user) return null;

    try {
      // Use secure RPC function to assign ep role (default to ep_consultant)
      const roleToAssign = data.role || 'ep_consultant';
      const { error: roleError } = await supabase
        .rpc('assign_ep_role', {
          _target_user_id: data.user_id,
          _role: roleToAssign,
        });

      if (roleError) throw roleError;

      // Create the consultant record
      const { data: consultant, error } = await supabase
        .from('ep_consultants')
        .insert({
          user_id: data.user_id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Consultor criado com sucesso');
      await loadData();
      return consultant;
    } catch (err) {
      console.error('Error creating consultant:', err);
      toast.error('Erro ao criar consultor');
      return null;
    }
  };

  const searchUserByEmail = async (email: string): Promise<{ id: string; name: string; email: string } | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return {
          id: data.id,
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email || '',
          email: data.email || '',
        };
      }
      return null;
    } catch (err) {
      console.error('Error searching user by email:', err);
      return null;
    }
  };

  const sendEPInvite = async (data: { email: string; name: string; role: 'ep_consultant' | 'head_cs' }): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        toast.error('Sessão expirada');
        return false;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-ep-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar convite');
      }

      toast.success('Convite enviado com sucesso');
      return true;
    } catch (err: any) {
      console.error('Error sending EP invite:', err);
      toast.error(err.message || 'Erro ao enviar convite');
      return false;
    }
  };

  const updateConsultant = async (id: string, data: Partial<EPConsultant>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ep_consultants')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast.success('Consultor atualizado');
      await loadData();
      return true;
    } catch (err) {
      console.error('Error updating consultant:', err);
      toast.error('Erro ao atualizar consultor');
      return false;
    }
  };

  const deactivateConsultant = async (id: string): Promise<boolean> => {
    try {
      // Deactivate all assignments first
      const { error: assignError } = await supabase
        .from('consultant_assignments')
        .update({ active: false })
        .eq('consultant_id', id);

      if (assignError) throw assignError;

      // Deactivate the consultant
      const { error } = await supabase
        .from('ep_consultants')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Consultor desativado com sucesso');
      await loadData();
      return true;
    } catch (err) {
      console.error('Error deactivating consultant:', err);
      toast.error('Erro ao desativar consultor');
      return false;
    }
  };

  const reactivateConsultant = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ep_consultants')
        .update({ active: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('Consultor reativado com sucesso');
      await loadData();
      return true;
    } catch (err) {
      console.error('Error reactivating consultant:', err);
      toast.error('Erro ao reativar consultor');
      return false;
    }
  };

  const getProjectConsultants = (accountId: string): EPConsultant[] => {
    const projectAssignments = assignments.filter(a => a.account_id === accountId && a.active);
    return allConsultants.filter(c => 
      projectAssignments.some(a => a.consultant_id === c.id)
    );
  };

  return {
    allProjects,
    allConsultants,
    loading,
    error,
    reloadData: loadData,
    assignConsultant,
    unassignConsultant,
    createConsultant,
    updateConsultant,
    deactivateConsultant,
    reactivateConsultant,
    getProjectConsultants,
    searchUserByEmail,
    sendEPInvite,
  };
}
