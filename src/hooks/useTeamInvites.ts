import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AccountInvite, AccountMember, AccountRole, Profile } from '@/types/account.types';

interface SendInviteResult {
  success: boolean;
  needsSeats?: boolean;
  needsPayment?: boolean;
  checkoutUrl?: string;
  inviteId?: string;
  proRataAmount?: number;
  message?: string;
}

interface BulkInviteResult {
  success: boolean;
  sent: string[];
  failed: { email: string; reason?: string }[];
  needsPayment: boolean;
  emailsNeedPayment: string[];
  message?: string;
}

interface MemberProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface MemberWithProfile {
  id: string;
  account_id: string;
  user_id: string;
  role: AccountRole;
  created_at: string;
  profile?: MemberProfile;
  is_active?: boolean;
  last_access_at?: string | null;
  deactivated_at?: string | null;
  deactivated_by?: string | null;
}

interface UseTeamInvitesReturn {
  invites: AccountInvite[];
  members: MemberWithProfile[];
  loading: boolean;
  fetchInvites: () => Promise<void>;
  fetchMembers: () => Promise<void>;
  sendInvite: (email: string, role: AccountRole, skipSeatsCheck?: boolean) => Promise<SendInviteResult>;
  sendBulkInvites: (emails: string[], role: AccountRole) => Promise<BulkInviteResult>;
  sendInviteWithPayment: (email: string, role: AccountRole) => Promise<SendInviteResult>;
  cancelInvite: (inviteId: string) => Promise<boolean>;
  resendInvite: (inviteId: string) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  updateMemberRole: (memberId: string, newRole: AccountRole) => Promise<boolean>;
  toggleMemberActive: (memberId: string, isActive: boolean) => Promise<boolean>;
  fetchMyInvites: () => Promise<AccountInvite[]>;
  acceptInvite: (inviteId: string) => Promise<boolean>;
  rejectInvite: (inviteId: string) => Promise<boolean>;
}

export function useTeamInvites(accountId: string | null): UseTeamInvitesReturn {
  const { user } = useAuth();
  const [invites, setInvites] = useState<AccountInvite[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInvites = useCallback(async () => {
    if (!accountId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('account_invites')
        .select('*')
        .eq('account_id', accountId)
        .eq('accepted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites((data || []) as AccountInvite[]);
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const fetchMembers = useCallback(async () => {
    if (!accountId) return;

    try {
      setLoading(true);
      
      // Fetch members with new activity fields
      const { data: membersData, error: membersError } = await supabase
        .from('account_members')
        .select('id, account_id, user_id, role, created_at, is_active, last_access_at, deactivated_at, deactivated_by')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;

      // Fetch profiles for each member
      const membersWithProfiles = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name')
            .eq('id', member.user_id)
            .maybeSingle();
          
          return {
            ...member,
            profile: profile || undefined,
          };
        })
      );
      
      setMembers(membersWithProfiles as MemberWithProfile[]);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const sendInvite = useCallback(async (email: string, role: AccountRole, skipSeatsCheck: boolean = false): Promise<SendInviteResult> => {
    if (!accountId || !user) {
      toast.error('Erro ao enviar convite');
      return { success: false, message: 'Erro ao enviar convite' };
    }

    try {
      // Check seats availability before sending invite (unless skipped)
      if (!skipSeatsCheck) {
        // Fetch current seats info
        const { data: orgSeats } = await supabase
          .from('org_seats')
          .select('*')
          .eq('org_id', accountId)
          .maybeSingle();

        // Seat grants (temporary) for this org
        const nowIso = new Date().toISOString();
        const { data: seatGrant } = await supabase
          .from('org_seat_grants')
          .select('free_seats, valid_until')
          .eq('org_id', accountId)
          .gte('valid_until', nowIso)
          .order('valid_until', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: billing } = await supabase
          .from('org_billing')
          .select('status')
          .eq('org_id', accountId)
          .maybeSingle();

        // Check for admin grant (grace period)
        const { data: adminGrant } = await supabase
          .from('admin_grants')
          .select('id, expires_at')
          .eq('org_id', accountId)
          .is('revoked_at', null)
          .gte('expires_at', new Date().toISOString())
          .maybeSingle();

        // If no admin grant and has billing, check seats
        if (!adminGrant && billing?.status) {
          const { count: memberCount } = await supabase
            .from('account_members')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', accountId);

          const { count: inviteCount } = await supabase
            .from('account_invites')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .eq('accepted', false);

          const includedSeats = orgSeats?.included_seats || 1;
          const currentExtraSeats = orgSeats?.current_seat_count || 0;
          const grantedSeats = seatGrant?.free_seats || 0;
          const totalSeats = includedSeats + currentExtraSeats + grantedSeats;
          const usedSeats = (memberCount || 0) + (inviteCount || 0);

          if (usedSeats >= totalSeats) {
            return { 
              success: false, 
              needsSeats: true,
              message: 'Você não tem assentos disponíveis. Compre mais assentos para convidar novos membros.' 
            };
          }
        }
      }

      // Check if invite already exists
      const { data: existingInvite } = await supabase
        .from('account_invites')
        .select('id')
        .eq('account_id', accountId)
        .eq('email', email.toLowerCase())
        .eq('accepted', false)
        .maybeSingle();

      if (existingInvite) {
        toast.error('Já existe um convite pendente para este email');
        return { success: false, message: 'Já existe um convite pendente para este email' };
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingMember) {
        const { data: alreadyMember } = await supabase
          .from('account_members')
          .select('id')
          .eq('account_id', accountId)
          .eq('user_id', existingMember.id)
          .maybeSingle();

        if (alreadyMember) {
          toast.error('Este usuário já é membro da equipe');
          return { success: false, message: 'Este usuário já é membro da equipe' };
        }
      }

      // Create invite
      const { data: invite, error: insertError } = await supabase
        .from('account_invites')
        .insert({
          account_id: accountId,
          email: email.toLowerCase(),
          role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send email via edge function
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-team-invite', {
        body: {
          email: email.toLowerCase(),
          role,
          account_id: accountId,
          invite_id: invite.id,
        },
      });

      const sendOk = !emailError && emailData?.success === true;
      if (!sendOk) {
        const reason = emailData?.error || emailError?.message || 'Falha desconhecida no envio';
        console.error('Error sending invite email:', reason, emailError, emailData);
        toast.error(`Convite criado, mas o email NÃO foi entregue: ${reason}. Use "Reenviar" para tentar novamente.`);
      } else {
        toast.success('Convite enviado com sucesso');
      }

      // Sync seats with Stripe after adding invite
      try {
        await supabase.functions.invoke('update-subscription-seats', {
          body: { account_id: accountId, action: 'sync' }
        });
      } catch (syncError) {
        console.error('Error syncing seats after invite:', syncError);
      }

      await fetchInvites();
      return { success: true };
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error('Erro ao enviar convite');
      return { success: false, message: 'Erro ao enviar convite' };
    }
  }, [accountId, user, fetchInvites]);

  const cancelInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try {
      // Get the invite's account_id before deleting
      const { data: invite } = await supabase
        .from('account_invites')
        .select('account_id')
        .eq('id', inviteId)
        .single();

      const { error } = await supabase
        .from('account_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast.success('Convite cancelado');

      // Sync seats with Stripe after canceling invite
      if (invite?.account_id) {
        try {
          await supabase.functions.invoke('update-subscription-seats', {
            body: { account_id: invite.account_id, action: 'sync' }
          });
        } catch (syncError) {
          console.error('Error syncing seats after cancel:', syncError);
        }
      }

      await fetchInvites();
      return true;
    } catch (error) {
      console.error('Error canceling invite:', error);
      toast.error('Erro ao cancelar convite');
      return false;
    }
  }, [fetchInvites]);

  const resendInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try {
      // Fetch existing invite data
      const { data: invite, error: inviteError } = await supabase
        .from('account_invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (inviteError || !invite) {
        toast.error('Convite não encontrado');
        return false;
      }

      // Send email via edge function
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-team-invite', {
        body: {
          email: invite.email,
          role: invite.role,
          account_id: invite.account_id,
          invite_id: invite.id,
        },
      });

      const sendOk = !emailError && emailData?.success === true;
      if (!sendOk) {
        const reason = emailData?.error || emailError?.message || 'Falha desconhecida no envio';
        console.error('Error resending invite email:', reason, emailError, emailData);
        toast.error(`Erro ao reenviar convite: ${reason}`);
        return false;
      }

      toast.success('Convite reenviado com sucesso');
      return true;
    } catch (error) {
      console.error('Error resending invite:', error);
      toast.error('Erro ao reenviar convite');
      return false;
    }
  }, []);

  const removeMember = useCallback(async (memberId: string): Promise<boolean> => {
    if (!accountId) {
      toast.error('Conta não encontrada');
      return false;
    }

    try {
      const { error } = await supabase
        .from('account_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Membro removido');

      // Sync seats with Stripe after removing member
      try {
        await supabase.functions.invoke('update-subscription-seats', {
          body: { account_id: accountId, action: 'sync' }
        });
      } catch (syncError) {
        console.error('Error syncing seats after removal:', syncError);
      }

      await fetchMembers();
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Erro ao remover membro');
      return false;
    }
  }, [accountId, fetchMembers]);

  const updateMemberRole = useCallback(async (memberId: string, newRole: AccountRole): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('account_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Cargo atualizado com sucesso');
      await fetchMembers();
      return true;
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Erro ao atualizar cargo');
      return false;
    }
  }, [fetchMembers]);

  const toggleMemberActive = useCallback(async (memberId: string, isActive: boolean): Promise<boolean> => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    try {
      const updateData: { is_active: boolean; deactivated_at?: string | null; deactivated_by?: string | null } = {
        is_active: isActive,
      };

      if (!isActive) {
        updateData.deactivated_at = new Date().toISOString();
        updateData.deactivated_by = user.id;
      } else {
        updateData.deactivated_at = null;
        updateData.deactivated_by = null;
      }

      const { error } = await supabase
        .from('account_members')
        .update(updateData)
        .eq('id', memberId);

      if (error) throw error;

      toast.success(isActive ? 'Membro ativado com sucesso' : 'Membro desativado com sucesso');
      await fetchMembers();
      return true;
    } catch (error) {
      console.error('Error toggling member active status:', error);
      toast.error('Erro ao atualizar status do membro');
      return false;
    }
  }, [user, fetchMembers]);

  // New webhook-first flow: Create invite with payment
  const sendInviteWithPayment = useCallback(async (email: string, role: AccountRole): Promise<SendInviteResult> => {
    if (!accountId || !user) {
      toast.error('Erro ao enviar convite');
      return { success: false, message: 'Erro ao enviar convite' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-invite-with-payment', {
        body: {
          account_id: accountId,
          email: email.toLowerCase(),
          role,
        },
      });

      if (error) {
        console.error('Error creating invite with payment:', error);
        toast.error(error.message || 'Erro ao criar convite');
        return { success: false, message: error.message };
      }

      if (data?.error) {
        toast.error(data.error);
        return { success: false, message: data.error };
      }

      // Refresh invites list
      await fetchInvites();

      return {
        success: true,
        needsPayment: true,
        checkoutUrl: data.url,
        inviteId: data.inviteId,
        proRataAmount: data.proRataAmount,
      };
    } catch (error) {
      console.error('Error sending invite with payment:', error);
      toast.error('Erro ao criar convite');
      return { success: false, message: 'Erro ao criar convite' };
    }
  }, [accountId, user, fetchInvites]);

  const sendBulkInvites = useCallback(async (emails: string[], role: AccountRole): Promise<BulkInviteResult> => {
    if (!accountId || !user) {
      toast.error('Erro ao enviar convites');
      return { success: false, sent: [], failed: [], needsPayment: false, emailsNeedPayment: [], message: 'Erro ao enviar convites' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-invites', {
        body: {
          account_id: accountId,
          emails,
          role,
        },
      });

      if (error) {
        console.error('Error sending bulk invites:', error);
        toast.error(error.message || 'Erro ao enviar convites');
        return { success: false, sent: [], failed: [], needsPayment: false, emailsNeedPayment: [], message: error.message };
      }

      if (data?.error) {
        toast.error(data.error);
        return { success: false, sent: [], failed: [], needsPayment: false, emailsNeedPayment: [], message: data.error };
      }

      // Refresh invites list once after all invites are sent
      await fetchInvites();

      return {
        success: true,
        sent: data.sent || [],
        failed: data.failed || [],
        needsPayment: data.needsPayment || false,
        emailsNeedPayment: data.emailsNeedPayment || [],
        message: data.message,
      };
    } catch (error) {
      console.error('Error sending bulk invites:', error);
      toast.error('Erro ao enviar convites');
      return { success: false, sent: [], failed: [], needsPayment: false, emailsNeedPayment: [], message: 'Erro ao enviar convites' };
    }
  }, [accountId, user, fetchInvites]);

  const fetchMyInvites = useCallback(async (): Promise<AccountInvite[]> => {
    if (!user?.email) return [];

    try {
      const { data, error } = await supabase
        .from('account_invites')
        .select(`
          *,
          account:companies(id, name)
        `)
        .eq('email', user.email.toLowerCase())
        .eq('accepted', false)
        .in('status', ['sent', 'pending']) // Only show sent invites, not awaiting_payment
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AccountInvite[];
    } catch (error) {
      console.error('Error fetching my invites:', error);
      return [];
    }
  }, [user?.email]);

  const acceptInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return false;
    }

    try {
      // Fetch invite details
      const { data: invite, error: inviteError } = await supabase
        .from('account_invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (inviteError || !invite) {
        toast.error('Convite não encontrado');
        return false;
      }

      if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
        toast.error('Este convite é para outro email');
        return false;
      }

      if (invite.accepted) {
        toast.error('Este convite já foi aceito');
        return false;
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name,
          last_name: user.user_metadata?.last_name,
          account_id: invite.account_id,
        });
      } else {
        // Update profile with account_id
        await supabase
          .from('profiles')
          .update({ account_id: invite.account_id })
          .eq('id', user.id);
      }

      // Add as member
      const { error: memberError } = await supabase
        .from('account_members')
        .insert({
          account_id: invite.account_id,
          user_id: user.id,
          role: invite.role,
        });

      if (memberError) {
        console.error('Error adding member:', memberError);
        toast.error('Erro ao aceitar convite');
        return false;
      }

      // Mark invite as accepted (both old 'accepted' field and new 'status' field)
      await supabase
        .from('account_invites')
        .update({ accepted: true, status: 'accepted' })
        .eq('id', inviteId);

      // Sync seats with Stripe after accepting invite (member added, invite removed from pending)
      try {
        await supabase.functions.invoke('update-subscription-seats', {
          body: { account_id: invite.account_id, action: 'sync' }
        });
      } catch (syncError) {
        console.error('Error syncing seats after accept:', syncError);
      }

      // Send welcome email (async, non-blocking)
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            user_id: user.id,
            account_id: invite.account_id,
            role: invite.role
          }
        });
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Non-critical, continue
      }

      toast.success('Convite aceito! Bem-vindo à equipe');
      return true;
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast.error('Erro ao aceitar convite');
      return false;
    }
  }, [user]);

  const rejectInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('account_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast.success('Convite recusado');
      return true;
    } catch (error) {
      console.error('Error rejecting invite:', error);
      toast.error('Erro ao recusar convite');
      return false;
    }
  }, []);

  return {
    invites,
    members,
    loading,
    fetchInvites,
    fetchMembers,
    sendInvite,
    sendBulkInvites,
    sendInviteWithPayment,
    cancelInvite,
    resendInvite,
    removeMember,
    updateMemberRole,
    toggleMemberActive,
    fetchMyInvites,
    acceptInvite,
    rejectInvite,
  };
}
