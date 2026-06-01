import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { EPPartnerUser, EPPartnerUserRole } from '@/types/partner.types';
import { toast } from 'sonner';

interface UseEPPartnerUsersReturn {
  users: EPPartnerUser[];
  loading: boolean;
  error: string | null;
  currentUserRole: EPPartnerUserRole | null;
  isOwner: boolean;
  refresh: () => Promise<void>;
  addUser: (email: string, role: EPPartnerUserRole) => Promise<{ success: boolean; error?: string }>;
  removeUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  updateUserRole: (userId: string, role: EPPartnerUserRole) => Promise<{ success: boolean; error?: string }>;
}

export function useEPPartnerUsers(partnerId: string | null): UseEPPartnerUsersReturn {
  const { user } = useAuth();
  const [users, setUsers] = useState<EPPartnerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<EPPartnerUserRole | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!partnerId || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch partner users
      const { data: usersData, error: usersError } = await supabase
        .from('ep_partner_users')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: true });

      if (usersError) throw usersError;

      // Get user IDs to fetch profiles
      const userIds = (usersData || []).map(u => u.user_id);
      
      // Fetch profiles for these users
      let profilesMap: Record<string, { id: string; email: string | null; first_name: string | null; last_name: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', userIds);
        
        if (!profilesError && profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as typeof profilesMap);
        }
      }

      // Map the data
      const mappedUsers: EPPartnerUser[] = (usersData || []).map(u => ({
        id: u.id,
        partner_id: u.partner_id,
        user_id: u.user_id,
        role: u.role as EPPartnerUserRole,
        invited_by: u.invited_by,
        created_at: u.created_at,
        profile: profilesMap[u.user_id] || undefined,
      }));

      setUsers(mappedUsers);

      // Find current user's role
      const currentUserEntry = mappedUsers.find(u => u.user_id === user.id);
      setCurrentUserRole(currentUserEntry?.role || null);

    } catch (err) {
      console.error('Error fetching partner users:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [partnerId, user]);

  const addUser = useCallback(async (email: string, role: EPPartnerUserRole): Promise<{ success: boolean; error?: string }> => {
    if (!partnerId || !user) {
      return { success: false, error: 'Sessão inválida' };
    }

    try {
      // Search for user by email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        return { success: false, error: 'Usuário não encontrado. Verifique o email.' };
      }

      // Check if already a member
      const existingUser = users.find(u => u.user_id === profileData.id);
      if (existingUser) {
        return { success: false, error: 'Este usuário já faz parte da equipe.' };
      }

      // Permitir múltiplos proprietários (co-owners)

      // Insert new partner user
      const { error: insertError } = await supabase
        .from('ep_partner_users')
        .insert({
          partner_id: partnerId,
          user_id: profileData.id,
          role,
          invited_by: user.id,
        });

      if (insertError) throw insertError;

      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error adding partner user:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao adicionar usuário' };
    }
  }, [partnerId, user, users, fetchUsers]);

  const removeUser = useCallback(async (targetUserId: string): Promise<{ success: boolean; error?: string }> => {
    if (!partnerId || !user) {
      return { success: false, error: 'Sessão inválida' };
    }

    // Find target user
    const targetUser = users.find(u => u.user_id === targetUserId);
    if (!targetUser) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    // Cannot remove owner
    if (targetUser.role === 'owner') {
      return { success: false, error: 'Não é possível remover o proprietário' };
    }

    try {
      const { error: deleteError } = await supabase
        .from('ep_partner_users')
        .delete()
        .eq('partner_id', partnerId)
        .eq('user_id', targetUserId);

      if (deleteError) throw deleteError;

      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error removing partner user:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao remover usuário' };
    }
  }, [partnerId, user, users, fetchUsers]);

  const updateUserRole = useCallback(async (targetUserId: string, newRole: EPPartnerUserRole): Promise<{ success: boolean; error?: string }> => {
    if (!partnerId || !user) {
      return { success: false, error: 'Sessão inválida' };
    }

    // Find target user
    const targetUser = users.find(u => u.user_id === targetUserId);
    if (!targetUser) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    // Permitir alterações de/para owner

    try {
      const { error: updateError } = await supabase
        .from('ep_partner_users')
        .update({ role: newRole })
        .eq('partner_id', partnerId)
        .eq('user_id', targetUserId);

      if (updateError) throw updateError;

      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error updating partner user role:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao alterar função' };
    }
  }, [partnerId, user, users, fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    currentUserRole,
    isOwner: currentUserRole === 'owner',
    refresh: fetchUsers,
    addUser,
    removeUser,
    updateUserRole,
  };
}
