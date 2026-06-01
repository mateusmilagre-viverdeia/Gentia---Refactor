import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

export type BillingStatusType = 'loading' | 'active' | 'past_due' | 'blocked' | 'unpaid' | 'trialing' | 'admin_grant' | 'partner_grant' | 'no_org';

interface BillingStatus {
  status: BillingStatusType;
  canAccess: boolean;
  daysUntilBlocked: number | null;
  hasGrant: boolean;
  hasPartnerGrant: boolean;
  grantExpiresAt: Date | null;
  subscriptionEnd: Date | null;
  graceUntil: Date | null;
  trialEnd: Date | null;
  daysUntilTrialEnd: number | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBillingStatus(): BillingStatus {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<BillingStatusType>('loading');
  const [canAccess, setCanAccess] = useState(true);
  const [daysUntilBlocked, setDaysUntilBlocked] = useState<number | null>(null);
  const [hasGrant, setHasGrant] = useState(false);
  const [hasPartnerGrant, setHasPartnerGrant] = useState(false);
  const [grantExpiresAt, setGrantExpiresAt] = useState<Date | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<Date | null>(null);
  const [graceUntil, setGraceUntil] = useState<Date | null>(null);
  const [trialEnd, setTrialEnd] = useState<Date | null>(null);
  const [daysUntilTrialEnd, setDaysUntilTrialEnd] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRefreshedAfterPayment, setHasRefreshedAfterPayment] = useState(false);

  const fetchBillingStatus = useCallback(async () => {
    if (!currentOrganization?.id || !user) {
      setStatus('no_org');
      setCanAccess(true); // Allow access if no org selected
      setIsLoading(false);
      return;
    }

    try {
      // Only show loading on first load to prevent flickering during refresh
      if (status === 'loading') {
        setIsLoading(true);
      }
      setError(null);

      // Check for active admin grant first (for org or user)
      // Order by expires_at DESC so we always pick the grant with the longest validity
      // (avoids showing "expires in N days" when a newer/longer grant exists).
      const { data: grants, error: grantError } = await supabase
        .from('admin_grants')
        .select('*')
        .or(`org_id.eq.${currentOrganization.id},user_id.eq.${user.id}`)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1);

      if (grantError) throw grantError;

      if (grants && grants.length > 0) {
        setStatus('admin_grant');
        setCanAccess(true);
        setHasGrant(true);
        setHasPartnerGrant(false);
        setGrantExpiresAt(new Date(grants[0].expires_at));
        setDaysUntilBlocked(null);
        setIsLoading(false);
        return;
      }

      // Check for partner grants (Sócio EP)
      const { data: partnerGrants, error: partnerGrantError } = await supabase
        .from('partner_client_grants')
        .select('*')
        .or(`org_id.eq.${currentOrganization.id},user_id.eq.${user.id}`)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1);

      if (partnerGrantError) throw partnerGrantError;

      if (partnerGrants && partnerGrants.length > 0) {
        setStatus('partner_grant');
        setCanAccess(true);
        setHasGrant(false);
        setHasPartnerGrant(true);
        setGrantExpiresAt(new Date(partnerGrants[0].expires_at));
        setDaysUntilBlocked(null);
        setIsLoading(false);
        return;
      }

      // Check org_billing status
      const { data: billing, error: billingError } = await supabase
        .from('org_billing')
        .select('*')
        .eq('org_id', currentOrganization.id)
        .maybeSingle();

      if (billingError) throw billingError;

      // If no billing record exists, org hasn't subscribed yet
      if (!billing) {
        // Trial-first fallback:
        // If the billing record hasn't been created yet (or was blocked by DB constraints),
        // we still allow usage for 15 days from org creation.
        const { data: org, error: orgError } = await supabase
          .from('companies')
          .select('created_at')
          .eq('id', currentOrganization.id)
          .maybeSingle();

        if (orgError) throw orgError;

        const createdAt = org?.created_at ? new Date(org.created_at) : null;
        if (createdAt) {
          const trialEndDate = new Date(createdAt);
          trialEndDate.setDate(trialEndDate.getDate() + 15);

          const now = new Date();
          const diffTime = trialEndDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          setTrialEnd(trialEndDate);
          setDaysUntilTrialEnd(diffDays > 0 ? diffDays : 0);

          if (now < trialEndDate) {
            setStatus('trialing');
            setCanAccess(true);
            setHasGrant(false);
            setHasPartnerGrant(false);
            setGrantExpiresAt(null);
            setDaysUntilBlocked(null);
            setSubscriptionEnd(null);
            setGraceUntil(null);
            setIsLoading(false);
            return;
          }
        }

        // Trial expired (or cannot determine creation date): require subscription.
        setStatus('unpaid');
        setCanAccess(false);
        setHasGrant(false);
        setHasPartnerGrant(false);
        setGrantExpiresAt(null);
        setDaysUntilBlocked(null);
        setSubscriptionEnd(null);
        setGraceUntil(null);
        setTrialEnd(null);
        setDaysUntilTrialEnd(null);
        setIsLoading(false);
        return;
      }

      const billingStatus = billing.status as BillingStatusType;
      setStatus(billingStatus);
      setHasGrant(false);
      setHasPartnerGrant(false);
      setGrantExpiresAt(null);

      if (billing.current_period_end) {
        setSubscriptionEnd(new Date(billing.current_period_end));
      }

      // Handle trial end date
      if (billing.trial_end) {
        const trialEndDate = new Date(billing.trial_end);
        setTrialEnd(trialEndDate);
        const now = new Date();
        const diffTime = trialEndDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysUntilTrialEnd(diffDays > 0 ? diffDays : 0);
      } else {
        setTrialEnd(null);
        setDaysUntilTrialEnd(null);
      }

      if (billing.grace_until) {
        setGraceUntil(new Date(billing.grace_until));
        const now = new Date();
        const grace = new Date(billing.grace_until);
        const diffTime = grace.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysUntilBlocked(diffDays > 0 ? diffDays : 0);
      } else {
        setDaysUntilBlocked(null);
      }

      // Determine access
      if (billingStatus === 'blocked') {
        // Fallback: verify with backend if this block is legitimate
        try {
          const { data: verifyResult } = await supabase.functions.invoke('verify-subscription-status', {
            body: { org_id: currentOrganization.id },
          });
          if (verifyResult?.active) {
            console.log('[useBillingStatus] Backend verification overrode blocked status:', verifyResult.reason);
            setStatus(verifyResult.reason === 'admin_grant' ? 'admin_grant' : 'active');
            setCanAccess(true);
            if (verifyResult.reason === 'admin_grant' && verifyResult.expires_at) {
              setHasGrant(true);
              setGrantExpiresAt(new Date(verifyResult.expires_at));
            }
            setIsLoading(false);
            return;
          }
        } catch (verifyErr) {
          console.error('[useBillingStatus] Fallback verification failed, allowing access to be safe:', verifyErr);
          setCanAccess(true);
          setIsLoading(false);
          return;
        }
        setCanAccess(false);
      } else if (billingStatus === 'active' || billingStatus === 'trialing') {
        setCanAccess(true);
      } else if (billingStatus === 'past_due') {
        // Still can access during grace period
        setCanAccess(true);
      } else {
        setCanAccess(false);
      }

    } catch (err) {
      console.error('Error fetching billing status:', err);
      setError(err instanceof Error ? err.message : 'Erro ao verificar status de pagamento');
      // Default to allowing access on error to prevent lockout
      setCanAccess(true);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, user]);

  useEffect(() => {
    fetchBillingStatus();
  }, [fetchBillingStatus]);

  // Detect return from Stripe payment and sync directly
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const seatsParam = searchParams.get('seats_purchased');
    const successParam = searchParams.get('success');
    
    if ((seatsParam || successParam) && !hasRefreshedAfterPayment && currentOrganization?.id) {
      console.log('[useBillingStatus] Detected return from Stripe, calling sync-after-checkout...');
      setHasRefreshedAfterPayment(true);
      
      // Call sync-after-checkout to directly sync with Stripe
      const syncAndRefresh = async () => {
        try {
          const { data: syncResult, error: syncError } = await supabase.functions.invoke('sync-after-checkout', {
            body: { org_id: currentOrganization.id },
          });
          
          if (syncError) {
            console.error('[useBillingStatus] sync-after-checkout error:', syncError);
          } else {
            console.log('[useBillingStatus] sync-after-checkout result:', syncResult);
          }
        } catch (err) {
          console.error('[useBillingStatus] sync-after-checkout exception:', err);
        }
        
        // Refresh billing status after sync attempt
        await fetchBillingStatus();
      };
      
      // Small delay to ensure checkout is finalized on Stripe's side
      const timeoutId = setTimeout(syncAndRefresh, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [location.search, hasRefreshedAfterPayment, fetchBillingStatus, currentOrganization?.id]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchBillingStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchBillingStatus]);

  return {
    status,
    canAccess,
    daysUntilBlocked,
    hasGrant,
    hasPartnerGrant,
    grantExpiresAt,
    subscriptionEnd,
    graceUntil,
    trialEnd,
    daysUntilTrialEnd,
    isLoading,
    error,
    refresh: fetchBillingStatus,
  };
}
