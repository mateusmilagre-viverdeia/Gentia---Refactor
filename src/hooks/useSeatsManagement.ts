import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SeatsInfo {
  totalSeats: number;
  usedSeats: number;
  pendingSeats: number;
  availableSeats: number;
  grantedSeats: number;
  grantedSeatsValidUntil: string | null;
  hasActiveSubscription: boolean;
  isTrialing: boolean;
  subscriptionStatus: string | null;
  isEPPartnerOrg: boolean; // Organization owned by EP Partner - exempt from seat charges
}

interface UseSeatsManagementReturn {
  seatsInfo: SeatsInfo;
  loading: boolean;
  error: string | null;
  fetchSeatsInfo: () => Promise<void>;
  syncSeatsWithStripe: () => Promise<boolean>;
  canAddMember: () => boolean;
  checkSeatsAvailability: (count?: number) => Promise<{ available: boolean; message?: string }>;
  addFreeSeats: (quantity: number) => Promise<{ success: boolean; error?: string }>;
}

const DEFAULT_SEATS_INFO: SeatsInfo = {
  totalSeats: 1,
  usedSeats: 0,
  pendingSeats: 0,
  availableSeats: 1,
  grantedSeats: 0,
  grantedSeatsValidUntil: null,
  hasActiveSubscription: false,
  isTrialing: false,
  subscriptionStatus: null,
  isEPPartnerOrg: false,
};

export function useSeatsManagement(accountId: string | null): UseSeatsManagementReturn {
  const [seatsInfo, setSeatsInfo] = useState<SeatsInfo>(DEFAULT_SEATS_INFO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSeatsInfo = useCallback(async () => {
    if (!accountId) {
      setSeatsInfo(DEFAULT_SEATS_INFO);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch org_seats
      const { data: orgSeats, error: seatsError } = await supabase
        .from('org_seats')
        .select('*')
        .eq('org_id', accountId)
        .maybeSingle();

       if (seatsError) throw seatsError;

      // Fetch org_billing for subscription status
      const { data: billing, error: billingError } = await supabase
        .from('org_billing')
        .select('status, stripe_subscription_id')
        .eq('org_id', accountId)
        .maybeSingle();

       if (billingError) throw billingError;

       // Fetch active org seat grant (temporary seats)
       const nowIso = new Date().toISOString();
       const { data: seatGrant, error: seatGrantError } = await supabase
         .from('org_seat_grants')
         .select('free_seats, valid_until')
         .eq('org_id', accountId)
         .gte('valid_until', nowIso)
         .order('valid_until', { ascending: false })
         .limit(1)
         .maybeSingle();

       if (seatGrantError) throw seatGrantError;

      // Get actual member count
      const { count: memberCount } = await supabase
        .from('account_members')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId);

      // Get pending invites count
      const { count: inviteCount } = await supabase
        .from('account_invites')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('accepted', false);

      // Check if this is an EP Partner's own organization
      const { data: epPartnerGrant } = await supabase
        .from('partner_client_grants')
        .select('id, ep_partners!ep_partners_own_project_grant_id_fkey(id)')
        .eq('org_id', accountId)
        .maybeSingle();
      
      const isEPPartnerOrg = !!epPartnerGrant?.ep_partners;

      const usedSeats = memberCount || 0;
      const pendingSeats = inviteCount || 0;
      
      // Calculate total seats from org_seats (included + current extra)
      const includedSeats = orgSeats?.included_seats || 1;
      const currentExtraSeats = orgSeats?.current_seat_count || 0;

       const grantedSeats = seatGrant?.free_seats || 0;
       const grantedSeatsValidUntil = seatGrant?.valid_until || null;

      // EP Partner organizations have unlimited seats
      const totalSeats = isEPPartnerOrg ? 999 : includedSeats + currentExtraSeats + grantedSeats;
      const availableSeats = isEPPartnerOrg ? 999 : Math.max(0, totalSeats - usedSeats - pendingSeats);

      const hasActiveSubscription = billing?.status === 'active' || billing?.status === 'trialing';
      const isTrialing = billing?.status === 'trialing';

      setSeatsInfo({
        totalSeats,
        usedSeats,
        pendingSeats,
        availableSeats,
        grantedSeats,
        grantedSeatsValidUntil,
        hasActiveSubscription,
        isTrialing,
        subscriptionStatus: billing?.status || null,
        isEPPartnerOrg,
      });

    } catch (err) {
      console.error('Error fetching seats info:', err);
      setError('Erro ao carregar informações de assentos');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const syncSeatsWithStripe = useCallback(async (): Promise<boolean> => {
    if (!accountId) {
      toast.error('Conta não encontrada');
      return false;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('update-subscription-seats', {
        body: { account_id: accountId, action: 'sync' }
      });

      if (error) {
        console.error('Error syncing seats:', error);
        toast.error('Erro ao sincronizar assentos');
        return false;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Erro ao sincronizar assentos');
        return false;
      }

      // Refresh seats info
      await fetchSeatsInfo();
      return true;

    } catch (err) {
      console.error('Error syncing seats:', err);
      toast.error('Erro ao sincronizar assentos');
      return false;
    } finally {
      setLoading(false);
    }
  }, [accountId, fetchSeatsInfo]);

  const canAddMember = useCallback((): boolean => {
    // EP Partner organizations can add unlimited members
    if (seatsInfo.isEPPartnerOrg) return true;
    
    // If no active subscription, allow during trial or if no billing is set up yet
    if (!seatsInfo.hasActiveSubscription && seatsInfo.subscriptionStatus !== 'trialing') {
      // Allow adding if there's no billing set up (free tier or pre-subscription)
      return seatsInfo.subscriptionStatus === null;
    }
    return seatsInfo.availableSeats > 0;
  }, [seatsInfo]);

  const checkSeatsAvailability = useCallback(async (count: number = 1): Promise<{ available: boolean; message?: string }> => {
    // Refresh seats info first
    await fetchSeatsInfo();

    // EP Partner organizations always have availability
    if (seatsInfo.isEPPartnerOrg) {
      return { available: true };
    }

    if (!seatsInfo.hasActiveSubscription && seatsInfo.subscriptionStatus !== null) {
      return { 
        available: false, 
        message: 'Assinatura inativa. Renove sua assinatura para adicionar membros.' 
      };
    }

    if (seatsInfo.availableSeats < count) {
      const needed = count - seatsInfo.availableSeats;
      return { 
        available: false, 
        message: `Você precisa de mais ${needed} assento(s). Upgrade seu plano para adicionar mais membros.` 
      };
    }

    return { available: true };
  }, [seatsInfo, fetchSeatsInfo]);

  // Function to add free seats for EP Partner organizations
  const addFreeSeats = useCallback(async (quantity: number): Promise<{ success: boolean; error?: string }> => {
    if (!accountId) {
      return { success: false, error: 'Conta não encontrada' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-seats-checkout', {
        body: {
          account_id: accountId,
          quantity,
          price_id: 'price_1RHqWXLTBUDFdRj5VYpVDawg', // Default price ID
        },
      });

      if (error) throw error;
      
      if (data?.exempt) {
        // Seats were added for free
        await fetchSeatsInfo();
        return { success: true };
      } else if (data?.url) {
        // Needs payment - redirect
        window.open(data.url, '_blank');
        return { success: true };
      }
      
      return { success: false, error: 'Resposta inesperada' };
    } catch (err) {
      console.error('Error adding seats:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao adicionar assentos' };
    }
  }, [accountId, fetchSeatsInfo]);

  // Fetch seats info when accountId changes
  useEffect(() => {
    if (accountId) {
      fetchSeatsInfo();
    }
  }, [accountId, fetchSeatsInfo]);

  // Realtime subscription to org_seats for automatic updates
  useEffect(() => {
    if (!accountId) return;

    console.log('[Realtime] Setting up org_seats subscription for:', accountId);

    const channel = supabase
      .channel(`org_seats_${accountId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'org_seats',
          filter: `org_id=eq.${accountId}`
        },
        (payload) => {
          console.log('[Realtime] org_seats updated:', payload);
          
          // Refresh data
          fetchSeatsInfo();
          
          // Show success toast
          toast.success('Assentos atualizados!', {
            description: 'Seu pagamento foi processado com sucesso.'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'org_seat_grants',
          filter: `org_id=eq.${accountId}`,
        },
        (payload) => {
          console.log('[Realtime] org_seat_grants changed:', payload);
          fetchSeatsInfo();
          toast.success('Assentos atualizados!', {
            description: 'Uma liberação de assentos foi aplicada.'
          });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      console.log('[Realtime] Removing channel for:', accountId);
      supabase.removeChannel(channel);
    };
  }, [accountId, fetchSeatsInfo]);

  return {
    seatsInfo,
    loading,
    error,
    fetchSeatsInfo,
    syncSeatsWithStripe,
    canAddMember,
    checkSeatsAvailability,
    addFreeSeats,
  };
}
