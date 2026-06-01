import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PartnerRoyalty } from "@/types/partner.types";

export interface PartnerDirectSale {
  id: string;
  partner_id: string;
  org_id: string | null;
  sale_date: string;
  description: string | null;
  total_amount: number;
  partner_share_percentage: number;
  partner_share_amount: number;
  ep_share_amount: number;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  created_by: string;
}

export interface MonthlyFinancialData {
  period: string; // YYYY-MM
  periodLabel: string; // "Jan/2026"
  royalties: number;
  commissions: number;
  netBalance: number;
  royaltiesStatus: 'pending' | 'paid' | 'partial';
  commissionsStatus: 'pending' | 'paid' | 'credited' | 'partial';
}

export interface FinancialSummary {
  // Royalties (sócio deve à EP)
  totalRoyalties: number;
  royaltiesPending: number;
  royaltiesPaid: number;
  
  // Comissões (EP deve ao sócio)
  totalCommissions: number;
  commissionsPending: number;
  commissionsPaid: number;
  
  // Encontro de contas
  netBalance: number; // Positivo = sócio deve, Negativo = EP deve
  netBalanceStatus: 'partner_owes' | 'ep_owes' | 'balanced';
}

export interface UseEPPartnerFinancialsReturn {
  partnerId: string | null;
  royalties: PartnerRoyalty[];
  directSales: PartnerDirectSale[];
  monthlyData: MonthlyFinancialData[];
  summary: FinancialSummary;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEPPartnerFinancials(): UseEPPartnerFinancialsReturn {
  const { user } = useAuth();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [royalties, setRoyalties] = useState<PartnerRoyalty[]>([]);
  const [directSales, setDirectSales] = useState<PartnerDirectSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancialData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Get partner ID
      const { data: partner, error: partnerError } = await supabase
        .from('ep_partners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (partnerError) throw partnerError;
      if (!partner) {
        setError("Parceiro não encontrado");
        setLoading(false);
        return;
      }

      setPartnerId(partner.id);

      // Fetch royalties and direct sales in parallel
      const [royaltiesResult, salesResult] = await Promise.all([
        supabase
          .from('partner_royalties')
          .select(`
            *,
            company:companies!partner_royalties_org_id_fkey(id, name)
          `)
          .eq('partner_id', partner.id)
          .order('period_start', { ascending: false }),
        supabase
          .from('partner_direct_sales')
          .select('*')
          .eq('partner_id', partner.id)
          .order('sale_date', { ascending: false })
      ]);

      if (royaltiesResult.error) throw royaltiesResult.error;
      if (salesResult.error) throw salesResult.error;

      setRoyalties(royaltiesResult.data || []);
      setDirectSales(salesResult.data || []);
    } catch (err: any) {
      console.error('[useEPPartnerFinancials] Error:', err);
      setError(err.message || "Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  // Calculate financial summary
  const summary = useMemo<FinancialSummary>(() => {
    const totalRoyalties = royalties.reduce((sum, r) => sum + r.royalty_amount, 0);
    const royaltiesPending = royalties
      .filter(r => r.status === 'pending' || r.status === 'invoiced')
      .reduce((sum, r) => sum + r.royalty_amount, 0);
    const royaltiesPaid = royalties
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + r.royalty_amount, 0);

    const totalCommissions = directSales.reduce((sum, s) => sum + s.partner_share_amount, 0);
    const commissionsPending = directSales
      .filter(s => s.status === 'pending')
      .reduce((sum, s) => sum + s.partner_share_amount, 0);
    const commissionsPaid = directSales
      .filter(s => s.status === 'paid' || s.status === 'credited')
      .reduce((sum, s) => sum + s.partner_share_amount, 0);

    // Net balance: positive = partner owes EP, negative = EP owes partner
    const netBalance = royaltiesPending - commissionsPending;
    
    let netBalanceStatus: 'partner_owes' | 'ep_owes' | 'balanced' = 'balanced';
    if (netBalance > 0) netBalanceStatus = 'partner_owes';
    else if (netBalance < 0) netBalanceStatus = 'ep_owes';

    return {
      totalRoyalties,
      royaltiesPending,
      royaltiesPaid,
      totalCommissions,
      commissionsPending,
      commissionsPaid,
      netBalance,
      netBalanceStatus,
    };
  }, [royalties, directSales]);

  // Group data by month for chart and table
  const monthlyData = useMemo<MonthlyFinancialData[]>(() => {
    const monthMap = new Map<string, MonthlyFinancialData>();

    // Process royalties
    royalties.forEach(r => {
      const date = new Date(r.period_start);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const periodLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      if (!monthMap.has(period)) {
        monthMap.set(period, {
          period,
          periodLabel,
          royalties: 0,
          commissions: 0,
          netBalance: 0,
          royaltiesStatus: 'pending',
          commissionsStatus: 'pending',
        });
      }
      
      const data = monthMap.get(period)!;
      data.royalties += r.royalty_amount;
      
      if (r.status === 'paid') {
        data.royaltiesStatus = data.royalties === r.royalty_amount ? 'paid' : 'partial';
      }
    });

    // Process direct sales
    directSales.forEach(s => {
      const date = new Date(s.sale_date);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const periodLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      if (!monthMap.has(period)) {
        monthMap.set(period, {
          period,
          periodLabel,
          royalties: 0,
          commissions: 0,
          netBalance: 0,
          royaltiesStatus: 'pending',
          commissionsStatus: 'pending',
        });
      }
      
      const data = monthMap.get(period)!;
      data.commissions += s.partner_share_amount;
      
      if (s.status === 'paid' || s.status === 'credited') {
        data.commissionsStatus = data.commissions === s.partner_share_amount ? 'paid' : 'partial';
      }
    });

    // Calculate net balance for each month
    monthMap.forEach(data => {
      data.netBalance = data.royalties - data.commissions;
    });

    // Sort by period descending
    return Array.from(monthMap.values()).sort((a, b) => b.period.localeCompare(a.period));
  }, [royalties, directSales]);

  return {
    partnerId,
    royalties,
    directSales,
    monthlyData,
    summary,
    loading,
    error,
    refresh: fetchFinancialData,
  };
}
