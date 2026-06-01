import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PartnerRoyalty, EPPartner } from '@/types/partner.types';

export interface DirectSale {
  id: string;
  partner_id: string;
  org_id: string | null;
  sale_date: string;
  description: string | null;
  total_amount: number;
  partner_share_percentage: number;
  partner_share_amount: number;
  ep_share_amount: number;
  status: string;
  created_at: string;
  created_by: string;
  notes: string | null;
  partner?: EPPartner;
  company?: {
    id: string;
    name: string;
  };
}

export interface PartnerBalance {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  totalRoyaltiesPending: number;
  totalCommissionsPending: number;
  netBalance: number; // positive = partner owes EP, negative = EP owes partner
}

interface RegisterSaleData {
  partnerId: string;
  orgId?: string;
  saleDate: Date;
  description: string;
  totalAmount: number;
  notes?: string;
}

interface UseAdminRoyaltiesReturn {
  royalties: PartnerRoyalty[];
  directSales: DirectSale[];
  balances: PartnerBalance[];
  totals: {
    pendingRoyalties: number;
    pendingCommissions: number;
    netBalance: number;
  };
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  registerDirectSale: (data: RegisterSaleData) => Promise<{ success: boolean; error?: string }>;
  markRoyaltyAsPaid: (royaltyId: string) => Promise<{ success: boolean; error?: string }>;
  markSaleAsPaid: (saleId: string) => Promise<{ success: boolean; error?: string }>;
  creditSaleToRoyalties: (saleId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useAdminRoyalties(): UseAdminRoyaltiesReturn {
  const { user } = useAuth();
  const [royalties, setRoyalties] = useState<PartnerRoyalty[]>([]);
  const [directSales, setDirectSales] = useState<DirectSale[]>([]);
  const [balances, setBalances] = useState<PartnerBalance[]>([]);
  const [totals, setTotals] = useState({ pendingRoyalties: 0, pendingCommissions: 0, netBalance: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all partners
      const { data: partnersData, error: partnersError } = await supabase
        .from('ep_partners')
        .select('*');

      if (partnersError) throw partnersError;

      // Fetch all royalties with company info
      const { data: royaltiesData, error: royaltiesError } = await supabase
        .from('partner_royalties')
        .select(`
          *,
          company:companies!partner_royalties_org_id_fkey(id, name)
        `)
        .order('period_start', { ascending: false });

      if (royaltiesError) throw royaltiesError;
      setRoyalties((royaltiesData || []) as PartnerRoyalty[]);

      // Fetch all direct sales
      const { data: salesData, error: salesError } = await supabase
        .from('partner_direct_sales')
        .select(`
          *,
          company:companies!partner_direct_sales_org_id_fkey(id, name)
        `)
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;

      // Map sales with partner info
      const salesWithPartner = (salesData || []).map(sale => ({
        ...sale,
        partner: partnersData?.find(p => p.id === sale.partner_id),
      }));
      setDirectSales(salesWithPartner as DirectSale[]);

      // Calculate balances per partner
      const partnerBalances: PartnerBalance[] = (partnersData || []).map(partner => {
        const partnerRoyalties = (royaltiesData || []).filter(r => r.partner_id === partner.id && r.status === 'pending');
        const partnerSales = (salesData || []).filter(s => s.partner_id === partner.id && s.status === 'pending');

        const totalRoyaltiesPending = partnerRoyalties.reduce((acc, r) => acc + (r.royalty_amount || 0), 0);
        const totalCommissionsPending = partnerSales.reduce((acc, s) => acc + (s.partner_share_amount || 0), 0);

        return {
          partnerId: partner.id,
          partnerName: partner.name,
          partnerEmail: partner.email,
          totalRoyaltiesPending,
          totalCommissionsPending,
          netBalance: totalRoyaltiesPending - totalCommissionsPending,
        };
      });

      setBalances(partnerBalances);

      // Calculate totals
      const totalPendingRoyalties = (royaltiesData || [])
        .filter(r => r.status === 'pending')
        .reduce((acc, r) => acc + (r.royalty_amount || 0), 0);

      const totalPendingCommissions = (salesData || [])
        .filter(s => s.status === 'pending')
        .reduce((acc, s) => acc + (s.partner_share_amount || 0), 0);

      setTotals({
        pendingRoyalties: totalPendingRoyalties,
        pendingCommissions: totalPendingCommissions,
        netBalance: totalPendingRoyalties - totalPendingCommissions,
      });

    } catch (err) {
      console.error('Error fetching royalties data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados de royalties');
    } finally {
      setLoading(false);
    }
  }, []);

  const registerDirectSale = useCallback(async (data: RegisterSaleData): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      const partnerSharePercentage = 85;
      const partnerShareAmount = data.totalAmount * (partnerSharePercentage / 100);
      const epShareAmount = data.totalAmount - partnerShareAmount;

      const { error: insertError } = await supabase
        .from('partner_direct_sales')
        .insert({
          partner_id: data.partnerId,
          org_id: data.orgId || null,
          sale_date: data.saleDate.toISOString().split('T')[0],
          description: data.description,
          total_amount: data.totalAmount,
          partner_share_percentage: partnerSharePercentage,
          partner_share_amount: partnerShareAmount,
          ep_share_amount: epShareAmount,
          status: 'pending',
          created_by: user.id,
          notes: data.notes || null,
        });

      if (insertError) throw insertError;

      await fetchAll();
      return { success: true };
    } catch (err) {
      console.error('Error registering direct sale:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao registrar venda' };
    }
  }, [user, fetchAll]);

  const markRoyaltyAsPaid = useCallback(async (royaltyId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('partner_royalties')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', royaltyId);

      if (updateError) throw updateError;

      await fetchAll();
      return { success: true };
    } catch (err) {
      console.error('Error marking royalty as paid:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao marcar como pago' };
    }
  }, [fetchAll]);

  const markSaleAsPaid = useCallback(async (saleId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('partner_direct_sales')
        .update({ status: 'paid' })
        .eq('id', saleId);

      if (updateError) throw updateError;

      await fetchAll();
      return { success: true };
    } catch (err) {
      console.error('Error marking sale as paid:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao marcar como pago' };
    }
  }, [fetchAll]);

  const creditSaleToRoyalties = useCallback(async (saleId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Mark sale as credited
      const { error: updateError } = await supabase
        .from('partner_direct_sales')
        .update({ status: 'credited' })
        .eq('id', saleId);

      if (updateError) throw updateError;

      await fetchAll();
      return { success: true };
    } catch (err) {
      console.error('Error crediting sale to royalties:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao creditar venda' };
    }
  }, [fetchAll]);

  return {
    royalties,
    directSales,
    balances,
    totals,
    loading,
    error,
    fetchAll,
    registerDirectSale,
    markRoyaltyAsPaid,
    markSaleAsPaid,
    creditSaleToRoyalties,
  };
}
