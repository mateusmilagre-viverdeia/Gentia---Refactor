import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "@/hooks/useAccount";
import { toast } from "@/hooks/use-toast";

export type AssessmentType = 'disc' | 'qa';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface AssessmentInvitation {
  id: string;
  account_id: string;
  invited_by: string;
  invited_user_id: string;
  assessment_type: AssessmentType;
  status: InvitationStatus;
  session_id: string | null;
  sent_at: string;
  viewed_at: string | null;
  responded_at: string | null;
  expires_at: string;
  created_at: string;
  // Joined data
  invited_by_name?: string;
  invited_user_name?: string;
  invited_user_email?: string;
}

interface SendInvitationsParams {
  userIds: string[];
  assessmentType: AssessmentType;
}

export function useAssessmentInvitations(assessmentType?: AssessmentType) {
  const { user } = useAuth();
  const { account } = useAccount();
  const queryClient = useQueryClient();

  // Fetch invitations for the account (admin view)
  const { data: accountInvitations = [], isLoading: isLoadingAccountInvitations } = useQuery({
    queryKey: ['assessment-invitations', 'account', account?.id, assessmentType],
    queryFn: async () => {
      if (!account?.id) return [];

      let query = supabase
        .from('assessment_invitations')
        .select('*')
        .eq('account_id', account.id)
        .order('sent_at', { ascending: false });

      if (assessmentType) {
        query = query.eq('assessment_type', assessmentType);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with user names
      if (data && data.length > 0) {
        const userIds = [...new Set([
          ...data.map(i => i.invited_by),
          ...data.map(i => i.invited_user_id)
        ])];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        return data.map(inv => {
          const invitedByProfile = profiles?.find(p => p.id === inv.invited_by);
          const invitedUserProfile = profiles?.find(p => p.id === inv.invited_user_id);

          return {
            ...inv,
            invited_by_name: invitedByProfile
              ? `${invitedByProfile.first_name || ''} ${invitedByProfile.last_name || ''}`.trim()
              : 'Usuário',
            invited_user_name: invitedUserProfile
              ? `${invitedUserProfile.first_name || ''} ${invitedUserProfile.last_name || ''}`.trim()
              : 'Usuário',
            invited_user_email: invitedUserProfile?.email || ''
          } as AssessmentInvitation;
        });
      }

      return data as AssessmentInvitation[];
    },
    enabled: !!account?.id
  });

  // Fetch my pending invitations (user view)
  const { data: myPendingInvitations = [], isLoading: isLoadingMyInvitations } = useQuery({
    queryKey: ['assessment-invitations', 'my-pending', user?.id, assessmentType],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('assessment_invitations')
        .select('*')
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (assessmentType) {
        query = query.eq('assessment_type', assessmentType);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with inviter name
      if (data && data.length > 0) {
        const inviterIds = [...new Set(data.map(i => i.invited_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', inviterIds);

        return data.map(inv => {
          const inviterProfile = profiles?.find(p => p.id === inv.invited_by);
          return {
            ...inv,
            invited_by_name: inviterProfile
              ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim()
              : 'Usuário'
          } as AssessmentInvitation;
        });
      }

      return data as AssessmentInvitation[];
    },
    enabled: !!user?.id
  });

  // Send invitations mutation
  const sendInvitations = useMutation({
    mutationFn: async ({ userIds, assessmentType }: SendInvitationsParams) => {
      if (!user?.id || !account?.id) throw new Error('Usuário ou conta não encontrada');

      // Check for existing pending invitations
      const { data: existingInvitations } = await supabase
        .from('assessment_invitations')
        .select('invited_user_id')
        .eq('account_id', account.id)
        .eq('assessment_type', assessmentType)
        .eq('status', 'pending')
        .in('invited_user_id', userIds);

      const existingUserIds = new Set(existingInvitations?.map(i => i.invited_user_id) || []);
      const newUserIds = userIds.filter(id => !existingUserIds.has(id));

      if (newUserIds.length === 0) {
        throw new Error('Todos os usuários selecionados já possuem convites pendentes');
      }

      // Create invitations
      const invitationsToInsert = newUserIds.map(userId => ({
        account_id: account.id,
        invited_by: user.id,
        invited_user_id: userId,
        assessment_type: assessmentType
      }));

      const { data: insertedInvitations, error: insertError } = await supabase
        .from('assessment_invitations')
        .insert(invitationsToInsert)
        .select();

      if (insertError) throw insertError;

      // Create notifications
      const assessmentName = assessmentType === 'disc' ? 'Assessment DISC' : 'Teste QA';
      const targetUrl = assessmentType === 'disc' 
        ? '/retencao/assessment-disc'
        : '/retencao/assessment-qa';

      // Get inviter name for notification
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const inviterName = inviterProfile
        ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim()
        : 'Um administrador';

      const notifications = newUserIds.map(userId => ({
        user_id: userId,
        account_id: account.id,
        type: 'action',
        title: `Convite para ${assessmentName}`,
        message: `${inviterName} convidou você para realizar o ${assessmentName}`,
        link: targetUrl
      }));

      await supabase.from('notifications').insert(notifications);

      return insertedInvitations;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assessment-invitations'] });
      toast({ 
        title: 'Convites enviados!',
        description: `${data?.length || 0} convite(s) enviado(s) com sucesso.`
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao enviar convites',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Accept invitation mutation
  const acceptInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('assessment_invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('invited_user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-invitations'] });
    }
  });

  // Decline invitation mutation
  const declineInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('assessment_invitations')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('invited_user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-invitations'] });
      toast({ title: 'Convite recusado' });
    }
  });

  // Get users who already have pending invitations
  const getUsersWithPendingInvitations = useCallback(async (type: AssessmentType): Promise<string[]> => {
    if (!account?.id) return [];

    const { data } = await supabase
      .from('assessment_invitations')
      .select('invited_user_id')
      .eq('account_id', account.id)
      .eq('assessment_type', type)
      .eq('status', 'pending');

    return data?.map(i => i.invited_user_id) || [];
  }, [account?.id]);

  return {
    // Data
    accountInvitations,
    myPendingInvitations,
    
    // Loading states
    isLoadingAccountInvitations,
    isLoadingMyInvitations,
    
    // Mutations
    sendInvitations,
    acceptInvitation,
    declineInvitation,
    
    // Helpers
    getUsersWithPendingInvitations
  };
}
