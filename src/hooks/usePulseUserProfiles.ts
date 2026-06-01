import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PulseUserRole = 'admin_rh' | 'leader' | 'employee';

export interface PulseUserProfile {
  id: string;
  account_id: string;
  user_id: string;
  team_id: string | null;
  role: PulseUserRole | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  manager_id: string | null;
  org_node_id: string | null;
  job_title: string | null;
  user_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
  manager?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  org_node?: {
    id: string;
    title: string;
  } | null;
}

export interface CreateUserProfileData {
  user_id: string;
  role: PulseUserRole;
  team_id?: string;
  manager_id?: string;
  org_node_id?: string;
  job_title?: string;
}

export interface UpdateUserProfileData {
  role?: PulseUserRole;
  team_id?: string | null;
  is_active?: boolean;
}

export function usePulseUserProfiles(accountId: string | null) {
  const { toast } = useToast();
  const [userProfiles, setUserProfiles] = useState<PulseUserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUserProfiles = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pulse_user_profiles')
        .select(`
          id,
          user_id,
          role,
          team_id,
          manager_id,
          org_node_id,
          job_title,
          is_active,
          created_at,
          updated_at
        `)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedProfiles: PulseUserProfile[] = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', profile.user_id)
            .single();

          let team = null;
          if (profile.team_id) {
            const { data: teamData } = await supabase
              .from('pulse_teams')
              .select('id, name')
              .eq('id', profile.team_id)
              .single();
            team = teamData;
          }

          let manager = null;
          if (profile.manager_id) {
            const { data: managerProfile } = await supabase
              .from('profiles')
              .select('id, first_name, last_name')
              .eq('id', profile.manager_id)
              .single();
            manager = managerProfile;
          }

          let orgNode = null;
          if (profile.org_node_id) {
            const { data: nodeData } = await supabase
              .from('org_chart_nodes')
              .select('id, title')
              .eq('id', profile.org_node_id)
              .single();
            orgNode = nodeData;
          }

          return {
            ...profile,
            account_id: accountId,
            job_title: profile.job_title || null,
            user_profile: userProfile,
            team,
            manager,
            org_node: orgNode,
          };
        })
      );

      setUserProfiles(enrichedProfiles);
    } catch (error) {
      console.error('Error fetching pulse user profiles:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os perfis de usuário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [accountId, toast]);

  const createUserProfile = useCallback(async (data: CreateUserProfileData) => {
    if (!accountId) return null;
    
    try {
      const { data: existing } = await supabase
        .from('pulse_user_profiles')
        .select('id')
        .eq('account_id', accountId)
        .eq('user_id', data.user_id)
        .single();

      if (existing) {
        toast({
          title: 'Aviso',
          description: 'Este usuário já possui um perfil Pulse.',
          variant: 'destructive',
        });
        return null;
      }

      const { data: newProfile, error } = await supabase
        .from('pulse_user_profiles')
        .insert({
          account_id: accountId,
          user_id: data.user_id,
          role: data.role,
          team_id: data.team_id || null,
          manager_id: data.manager_id || null,
          org_node_id: data.org_node_id || null,
          job_title: data.job_title || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Perfil de usuário criado.',
      });

      await fetchUserProfiles();
      return newProfile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o perfil.',
        variant: 'destructive',
      });
      return null;
    }
  }, [accountId, fetchUserProfiles, toast]);

  const bulkCreateUserProfiles = useCallback(async (
    userIds: string[],
    defaultRole: PulseUserRole = 'employee',
    defaultTeamId?: string
  ): Promise<{ success: boolean; count: number }> => {
    if (!accountId || userIds.length === 0) return { success: false, count: 0 };
    
    try {
      const { data: existing } = await supabase
        .from('pulse_user_profiles')
        .select('user_id')
        .eq('account_id', accountId)
        .in('user_id', userIds);
      
      const existingUserIds = new Set((existing || []).map(e => e.user_id));
      const newUserIds = userIds.filter(id => !existingUserIds.has(id));
      
      if (newUserIds.length === 0) {
        toast({
          title: 'Info',
          description: 'Todos os usuários já estão no Pulse.',
        });
        return { success: true, count: 0 };
      }
      
      const profilesToCreate = newUserIds.map(user_id => ({
        account_id: accountId,
        user_id,
        role: defaultRole,
        team_id: defaultTeamId || null,
        is_active: true,
      }));
      
      const { error } = await supabase
        .from('pulse_user_profiles')
        .insert(profilesToCreate);
      
      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: `${newUserIds.length} usuário${newUserIds.length > 1 ? 's' : ''} adicionado${newUserIds.length > 1 ? 's' : ''} ao Pulse.`,
      });
      
      await fetchUserProfiles();
      return { success: true, count: newUserIds.length };
    } catch (error) {
      console.error('Error bulk creating profiles:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar os usuários.',
        variant: 'destructive',
      });
      return { success: false, count: 0 };
    }
  }, [accountId, fetchUserProfiles, toast]);

  const updateUserProfile = useCallback(async (profileId: string, data: UpdateUserProfileData) => {
    try {
      const { error } = await supabase
        .from('pulse_user_profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado.',
      });

      await fetchUserProfiles();
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchUserProfiles, toast]);

  const deleteUserProfile = useCallback(async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('pulse_user_profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Perfil removido.',
      });

      await fetchUserProfiles();
      return true;
    } catch (error) {
      console.error('Error deleting user profile:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o perfil.',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchUserProfiles, toast]);

  const toggleUserActive = useCallback(async (profileId: string, isActive: boolean) => {
    return updateUserProfile(profileId, { is_active: isActive });
  }, [updateUserProfile]);

  const changeUserRole = useCallback(async (profileId: string, role: PulseUserRole) => {
    return updateUserProfile(profileId, { role });
  }, [updateUserProfile]);

  const assignToTeam = useCallback(async (profileId: string, teamId: string | null) => {
    return updateUserProfile(profileId, { team_id: teamId });
  }, [updateUserProfile]);

  const fetchAvailableUsers = useCallback(async () => {
    if (!accountId) return [];
    
    try {
      // Get all account members
      const { data: members } = await supabase
        .from('account_members')
        .select('user_id')
        .eq('account_id', accountId)
        .eq('is_active', true);

      if (!members || members.length === 0) return [];

      // Get existing pulse profiles
      const { data: existingProfiles } = await supabase
        .from('pulse_user_profiles')
        .select('user_id')
        .eq('account_id', accountId);

      const existingUserIds = new Set((existingProfiles || []).map(p => p.user_id));
      const availableUserIds = members.filter(m => !existingUserIds.has(m.user_id)).map(m => m.user_id);

      if (availableUserIds.length === 0) return [];

      // Get profile details
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', availableUserIds);

      return profiles || [];
    } catch (error) {
      console.error('Error fetching available users:', error);
      return [];
    }
  }, [accountId]);

  return {
    userProfiles,
    loading,
    fetchUserProfiles,
    createUserProfile,
    bulkCreateUserProfiles,
    updateUserProfile,
    deleteUserProfile,
    toggleUserActive,
    changeUserRole,
    assignToTeam,
    fetchAvailableUsers,
  };
}
