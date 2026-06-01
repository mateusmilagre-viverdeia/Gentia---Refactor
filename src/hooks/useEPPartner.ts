import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { 
  EPPartner, 
  PartnerLicense, 
  PartnerClientGrant, 
  PartnerRoyalty,
  PartnerDashboardStats,
  EPPartnerUserRole
} from '@/types/partner.types';

interface UseEPPartnerReturn {
  partner: EPPartner | null;
  licenses: PartnerLicense[];
  grants: PartnerClientGrant[];
  royalties: PartnerRoyalty[];
  stats: PartnerDashboardStats;
  loading: boolean;
  error: string | null;
  userRole: EPPartnerUserRole | null;
  isOwner: boolean;
  refresh: () => Promise<void>;
  grantAccess: (orgId: string, expiresAt: Date, notes?: string) => Promise<{ success: boolean; error?: string }>;
  revokeAccess: (grantId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useEPPartner(): UseEPPartnerReturn {
  const { user } = useAuth();
  const [partner, setPartner] = useState<EPPartner | null>(null);
  const [licenses, setLicenses] = useState<PartnerLicense[]>([]);
  const [grants, setGrants] = useState<PartnerClientGrant[]>([]);
  const [royalties, setRoyalties] = useState<PartnerRoyalty[]>([]);
  const [stats, setStats] = useState<PartnerDashboardStats>({
    totalSeats: 0,
    usedSeats: 0,
    availableSeats: 0,
    activeClients: 0,
    monthlyRoyalties: 0,
    pendingRoyalties: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<EPPartnerUserRole | null>(null);

  const fetchPartnerData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, try to find partner via ep_partner_users table (new model)
      const { data: partnerUserData, error: partnerUserError } = await supabase
        .from('ep_partner_users')
        .select(`
          partner_id,
          role,
          partner:ep_partners!ep_partner_users_partner_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      let partnerData: EPPartner | null = null;
      let role: EPPartnerUserRole | null = null;

      if (partnerUserData?.partner && !partnerUserError) {
        // Found via ep_partner_users
        const p = partnerUserData.partner as Record<string, unknown>;
        if (p.active) {
          partnerData = p as unknown as EPPartner;
          role = partnerUserData.role as EPPartnerUserRole;
        }
      } else {
        // Fallback: try to find via direct user_id (legacy model)
        const { data: directPartner, error: directError } = await supabase
          .from('ep_partners')
          .select('*')
          .eq('user_id', user.id)
          .eq('active', true)
          .maybeSingle();

        if (directError) throw directError;
        
        if (directPartner) {
          partnerData = directPartner as EPPartner;
          role = 'owner'; // Direct user_id link means owner
        }
      }

      if (!partnerData) {
        setPartner(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      setPartner(partnerData);
      setUserRole(role);

      // Fetch licenses
      const { data: licensesData, error: licensesError } = await supabase
        .from('partner_licenses')
        .select('*')
        .eq('partner_id', partnerData.id)
        .eq('active', true)
        .order('valid_from', { ascending: false });

      if (licensesError) throw licensesError;
      setLicenses((licensesData || []) as PartnerLicense[]);

      // Fetch grants with company info
      const { data: grantsData, error: grantsError } = await supabase
        .from('partner_client_grants')
        .select(`
          *,
          company:companies!partner_client_grants_org_id_fkey(id, name, slug)
        `)
        .eq('partner_id', partnerData.id)
        .is('revoked_at', null)
        .order('granted_at', { ascending: false });

      if (grantsError) throw grantsError;
      setGrants((grantsData || []) as PartnerClientGrant[]);

      // Fetch royalties
      const { data: royaltiesData, error: royaltiesError } = await supabase
        .from('partner_royalties')
        .select(`
          *,
          company:companies!partner_royalties_org_id_fkey(id, name)
        `)
        .eq('partner_id', partnerData.id)
        .order('period_start', { ascending: false });

      if (royaltiesError) throw royaltiesError;
      setRoyalties((royaltiesData || []) as PartnerRoyalty[]);

      // Calculate stats
      const totalSeats = (licensesData || []).reduce((acc, l) => acc + (l.total_seats || 0), 0);
      // Count active grants as used seats (1 grant = 1 seat)
      const usedSeats = (grantsData || []).filter(g => !g.revoked_at).length;
      const activeClients = usedSeats;
      const pendingRoyalties = (royaltiesData || [])
        .filter(r => r.status === 'pending')
        .reduce((acc, r) => acc + (r.royalty_amount || 0), 0);

      // Current month royalties
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRoyalties = (royaltiesData || [])
        .filter(r => new Date(r.period_start) >= startOfMonth)
        .reduce((acc, r) => acc + (r.royalty_amount || 0), 0);

      setStats({
        totalSeats,
        usedSeats,
        availableSeats: totalSeats - usedSeats,
        activeClients,
        monthlyRoyalties,
        pendingRoyalties,
      });

    } catch (err) {
      console.error('Error fetching partner data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do parceiro');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const grantAccess = useCallback(async (
    orgId: string, 
    expiresAt: Date, 
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!partner || !user) {
      return { success: false, error: 'Parceiro não encontrado' };
    }

    try {
      // Check available seats
      if (stats.availableSeats <= 0) {
        return { success: false, error: 'Nenhuma vaga disponível' };
      }

      const { error: grantError } = await supabase
        .from('partner_client_grants')
        .insert({
          partner_id: partner.id,
          org_id: orgId,
          granted_by: user.id,
          expires_at: expiresAt.toISOString(),
          notes,
        });

      if (grantError) throw grantError;

      await fetchPartnerData();
      return { success: true };
    } catch (err) {
      console.error('Error granting access:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao conceder acesso' };
    }
  }, [partner, user, stats.availableSeats, fetchPartnerData]);

  const revokeAccess = useCallback(async (grantId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      const { error: revokeError } = await supabase
        .from('partner_client_grants')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq('id', grantId);

      if (revokeError) throw revokeError;

      await fetchPartnerData();
      return { success: true };
    } catch (err) {
      console.error('Error revoking access:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao revogar acesso' };
    }
  }, [user, fetchPartnerData]);

  useEffect(() => {
    fetchPartnerData();
  }, [fetchPartnerData]);

  return {
    partner,
    licenses,
    grants,
    royalties,
    stats,
    loading,
    error,
    userRole,
    isOwner: userRole === 'owner',
    refresh: fetchPartnerData,
    grantAccess,
    revokeAccess,
  };
}
