import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PulseTeam {
  id: string;
  account_id: string;
  name: string;
  leader_user_id: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined data
  leader_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  member_count?: number;
}

export interface CreateTeamData {
  name: string;
  leader_user_id?: string;
}

export interface UpdateTeamData {
  name?: string;
  leader_user_id?: string | null;
  is_active?: boolean;
}

export function usePulseTeams(accountId: string | null) {
  const { toast } = useToast();
  const [teams, setTeams] = useState<PulseTeam[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTeams = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pulse_teams')
        .select(`
          *,
          leader_profile:profiles!pulse_teams_leader_user_id_fkey(id, first_name, last_name, email)
        `)
        .eq('account_id', accountId)
        .order('name');

      if (error) throw error;

      // Get member counts
      const teamsWithCounts = await Promise.all(
        (data || []).map(async (team) => {
          const { count } = await supabase
            .from('pulse_user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)
            .eq('is_active', true);
          
          return {
            ...team,
            member_count: count || 0,
          } as PulseTeam;
        })
      );

      setTeams(teamsWithCounts);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as equipes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [accountId, toast]);

  const createTeam = useCallback(async (data: CreateTeamData) => {
    if (!accountId) return null;
    try {
      const { data: newTeam, error } = await supabase
        .from('pulse_teams')
        .insert({
          account_id: accountId,
          name: data.name,
          leader_user_id: data.leader_user_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Equipe criada com sucesso.',
      });

      await fetchTeams();
      return newTeam;
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a equipe.',
        variant: 'destructive',
      });
      return null;
    }
  }, [accountId, fetchTeams, toast]);

  const updateTeam = useCallback(async (teamId: string, data: UpdateTeamData) => {
    try {
      const { error } = await supabase
        .from('pulse_teams')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Equipe atualizada com sucesso.',
      });

      await fetchTeams();
      return true;
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a equipe.',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchTeams, toast]);

  const deleteTeam = useCallback(async (teamId: string) => {
    try {
      // First, remove team association from user profiles
      await supabase
        .from('pulse_user_profiles')
        .update({ team_id: null })
        .eq('team_id', teamId);

      const { error } = await supabase
        .from('pulse_teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Equipe excluída com sucesso.',
      });

      await fetchTeams();
      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a equipe.',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchTeams, toast]);

  const toggleTeamActive = useCallback(async (teamId: string, isActive: boolean) => {
    return updateTeam(teamId, { is_active: isActive });
  }, [updateTeam]);

  return {
    teams,
    loading,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    toggleTeamActive,
  };
}
