import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveGrant {
  expires_at: string;
  reason: string;
}

export interface OrgBillingData {
  id: string;
  org_id: string;
  org_name: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  grace_until: string | null;
  blocked_at: string | null;
  created_at: string | null;
  member_count: number;
  active_grant: ActiveGrant | null;
}

export interface BillingMetrics {
  mrr: number;
  totalOrgs: number;
  activeSubscribers: number;
  trialing: number;
  pastDue: number;
  blocked: number;
  canceled: number;
  pendingOrgs: number;
  churnRate: number;
  avgSeatsPerOrg: number;
  trialExpired: number;
  withGrants: number;
}

const BASE_PRICE = 297; // R$ 297/mês
const SEAT_PRICE = 19.90; // R$ 19,90/seat adicional

export function useAdminBilling() {
  const [orgs, setOrgs] = useState<OrgBillingData[]>([]);
  const [metrics, setMetrics] = useState<BillingMetrics>({
    mrr: 0,
    totalOrgs: 0,
    activeSubscribers: 0,
    trialing: 0,
    pastDue: 0,
    blocked: 0,
    canceled: 0,
    pendingOrgs: 0,
    churnRate: 0,
    avgSeatsPerOrg: 0,
    trialExpired: 0,
    withGrants: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Buscar todas as organizações com billing
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, created_at');

      if (companiesError) throw companiesError;

      // Buscar todos os billing records
      const { data: billingRecords, error: billingError } = await supabase
        .from('org_billing')
        .select('*');

      if (billingError) throw billingError;

      // Buscar seats
      const { data: seatsData, error: seatsError } = await supabase
        .from('org_seats')
        .select('org_id, current_seat_count');

      if (seatsError) throw seatsError;

      // Buscar membros por org
      const { data: membersData, error: membersError } = await supabase
        .from('account_members')
        .select('account_id');

      if (membersError) throw membersError;

      // Buscar grants ativos
      const { data: grantsData, error: grantsError } = await supabase
        .from('admin_grants')
        .select('org_id, expires_at, reason')
        .gt('expires_at', new Date().toISOString())
        .is('revoked_at', null);

      if (grantsError) throw grantsError;

      // Contar membros por org
      const memberCountByOrg: Record<string, number> = {};
      membersData?.forEach(m => {
        memberCountByOrg[m.account_id] = (memberCountByOrg[m.account_id] || 0) + 1;
      });

      // Mapear billing por org_id
      const billingByOrg: Record<string, any> = {};
      billingRecords?.forEach(b => {
        billingByOrg[b.org_id] = b;
      });

      // Mapear seats por org_id
      const seatsByOrg: Record<string, number> = {};
      seatsData?.forEach(s => {
        seatsByOrg[s.org_id] = s.current_seat_count || 0;
      });

      // Mapear grants ativos por org_id
      const grantsByOrg: Record<string, ActiveGrant> = {};
      grantsData?.forEach(g => {
        if (g.org_id) {
          grantsByOrg[g.org_id] = { expires_at: g.expires_at, reason: g.reason };
        }
      });

      // Combinar dados
      const combinedData: OrgBillingData[] = (companies || []).map(company => {
        const billing = billingByOrg[company.id] || {};
        return {
          id: billing.id || company.id,
          org_id: company.id,
          org_name: company.name,
          status: billing.status || 'pending',
          stripe_customer_id: billing.stripe_customer_id,
          stripe_subscription_id: billing.stripe_subscription_id,
          current_period_end: billing.current_period_end,
          trial_start: billing.trial_start,
          trial_end: billing.trial_end,
          grace_until: billing.grace_until,
          blocked_at: billing.blocked_at,
          created_at: company.created_at,
          member_count: memberCountByOrg[company.id] || 1,
          active_grant: grantsByOrg[company.id] || null,
        };
      });

      setOrgs(combinedData);

      // Calcular métricas
      const activeOrgs = combinedData.filter(o => o.status === 'active');
      const trialingOrgs = combinedData.filter(o => o.status === 'trialing');
      const pastDueOrgs = combinedData.filter(o => o.status === 'past_due');
      const blockedOrgs = combinedData.filter(o => o.status === 'blocked');
      const canceledOrgs = combinedData.filter(o => o.status === 'canceled');
      const pendingOrgs = combinedData.filter(o => o.status === 'pending' || !billingByOrg[o.org_id]);
      const trialExpiredOrgs = combinedData.filter(o => 
        o.trial_end && 
        new Date(o.trial_end) < new Date() && 
        o.status !== 'active'
      );
      const orgsWithGrants = combinedData.filter(o => o.active_grant);

      // Calcular MRR (apenas orgs ativas)
      let mrr = 0;
      let totalSeats = 0;
      activeOrgs.forEach(org => {
        mrr += BASE_PRICE;
        const additionalSeats = Math.max(0, org.member_count - 1);
        mrr += additionalSeats * SEAT_PRICE;
        totalSeats += additionalSeats;
      });

      // Calcular churn (cancelados no mês / total no início do mês)
      const totalForChurn = activeOrgs.length + canceledOrgs.length;
      const churnRate = totalForChurn > 0 
        ? (canceledOrgs.length / totalForChurn) * 100 
        : 0;

      const avgSeatsPerOrg = activeOrgs.length > 0 
        ? totalSeats / activeOrgs.length 
        : 0;

      setMetrics({
        mrr,
        totalOrgs: combinedData.length,
        activeSubscribers: activeOrgs.length,
        trialing: trialingOrgs.length,
        pastDue: pastDueOrgs.length,
        blocked: blockedOrgs.length,
        canceled: canceledOrgs.length,
        pendingOrgs: pendingOrgs.length,
        churnRate: Math.round(churnRate * 100) / 100,
        avgSeatsPerOrg: Math.round(avgSeatsPerOrg * 100) / 100,
        trialExpired: trialExpiredOrgs.length,
        withGrants: orgsWithGrants.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  return {
    orgs,
    metrics,
    isLoading,
    error,
    refresh: fetchBillingData,
  };
}
