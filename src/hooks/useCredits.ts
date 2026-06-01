import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface CreditBalance {
  id: string;
  account_id: string;
  credit_type: string;
  balance: number;
  monthly_included: number;
  monthly_used: number;
  total_purchased: number;
  total_used: number;
  last_purchase_at: string | null;
  last_reset_at: string | null;
}

export interface CreditCost {
  id: string;
  feature_key: string;
  credit_type: string;
  credits_per_use: number;
  description: string | null;
}

export interface CreditPackage {
  id: string;
  credit_type: string;
  name: string;
  description: string | null;
  credits: number;
  price_cents: number;
  bonus_percent: number;
  is_popular: boolean;
  display_order: number;
  billing_interval?: string;
  price_per_credit_cents?: number;
  stripe_price_id?: string;
}

export interface CreditSubscription {
  has_subscription: boolean;
  status: string | null;
  package_id: string | null;
  package_name: string | null;
  credits_per_period: number;
  current_period_end: string | null;
  stripe_subscription_id?: string;
}

interface UseCreditsReturn {
  credits: CreditBalance[];
  costs: CreditCost[];
  packages: CreditPackage[];
  isLoading: boolean;
  error: string | null;
  balance: number;
  subscription: CreditSubscription | null;
  subscriptionLoading: boolean;
  getBalance: (creditType: string) => number;
  getCost: (featureKey: string) => CreditCost | undefined;
  hasCredits: (featureKey: string) => boolean;
  consumeCredits: (params: ConsumeParams) => Promise<ConsumeResult>;
  purchaseCredits: (packageId: string) => Promise<void>;
  subscribeToPlan: (packageId: string) => Promise<void>;
  manageSubscription: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface ConsumeParams {
  featureKey?: string;
  creditType?: string;
  amount?: number;
  referenceId?: string;
  referenceType?: string;
  description?: string;
}

interface ConsumeResult {
  success: boolean;
  error?: string;
  message?: string;
  required?: number;
  available?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  consumed?: number;
}

export function useCredits(): UseCreditsReturn {
  const { currentOrganization } = useOrganization();
  const [credits, setCredits] = useState<CreditBalance[]>([]);
  const [costs, setCosts] = useState<CreditCost[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<CreditSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!currentOrganization?.id) {
      setCredits([]);
      setCosts([]);
      setPackages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: creditsData, error: creditsError } = await supabase
        .from('recruitment_usage_credits')
        .select('*')
        .eq('account_id', currentOrganization.id)
        .eq('credit_type', 'universal');

      if (creditsError) throw creditsError;

      const { data: costsData, error: costsError } = await supabase
        .from('recruitment_credit_costs')
        .select('*')
        .eq('is_active', true);

      if (costsError) throw costsError;

      const { data: packagesData, error: packagesError } = await supabase
        .from('recruitment_credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (packagesError) throw packagesError;

      setCredits((creditsData as CreditBalance[]) || []);
      setCosts((costsData as CreditCost[]) || []);
      setPackages((packagesData as CreditPackage[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar créditos';
      setError(message);
      console.error('Error fetching credits:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id]);

  const fetchSubscription = useCallback(async () => {
    if (!currentOrganization?.id) {
      setSubscription(null);
      setSubscriptionLoading(false);
      return;
    }

    setSubscriptionLoading(true);
    try {
      const response = await supabase.functions.invoke('credits-check-subscription', {
        body: { org_id: currentOrganization.id },
      });

      if (response.error) {
        console.error('Error checking subscription:', response.error);
        setSubscription(null);
      } else {
        setSubscription(response.data as CreditSubscription);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    fetchCredits();
    fetchSubscription();
  }, [fetchCredits, fetchSubscription]);

  const balance = credits.length > 0 ? Number(credits[0]?.balance || 0) : 0;

  const getBalance = useCallback((creditType: string): number => {
    const credit = credits.find(c => c.credit_type === 'universal') || credits[0];
    return credit?.balance || 0;
  }, [credits]);

  const getCost = useCallback((featureKey: string): CreditCost | undefined => {
    return costs.find(c => c.feature_key === featureKey);
  }, [costs]);

  const hasCredits = useCallback((featureKey: string): boolean => {
    const cost = getCost(featureKey);
    if (!cost) return false;
    return balance >= cost.credits_per_use;
  }, [getCost, balance]);

  const consumeCredits = useCallback(async (params: ConsumeParams): Promise<ConsumeResult> => {
    if (!currentOrganization?.id) {
      return { success: false, error: 'no_org', message: 'Organização não selecionada' };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        return { success: false, error: 'not_authenticated', message: 'Não autenticado' };
      }

      const response = await supabase.functions.invoke('credits-consume', {
        body: {
          org_id: currentOrganization.id,
          feature_key: params.featureKey,
          credit_type: 'universal',
          amount: params.amount,
          reference_id: params.referenceId,
          reference_type: params.referenceType,
          description: params.description,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          message: result.message,
          required: result.required,
          available: result.available,
        };
      }

      await fetchCredits();

      return {
        success: true,
        balanceBefore: result.balance_before,
        balanceAfter: result.balance_after,
        consumed: result.consumed,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao consumir créditos';
      return { success: false, error: 'unknown', message };
    }
  }, [currentOrganization?.id, fetchCredits]);

  const purchaseCredits = useCallback(async (packageId: string): Promise<void> => {
    if (!currentOrganization?.id) {
      toast.error('Organização não selecionada');
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Você precisa estar logado para comprar créditos');
        return;
      }

      const response = await supabase.functions.invoke('credits-purchase', {
        body: {
          org_id: currentOrganization.id,
          package_id: packageId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { url } = response.data;
      if (url) {
        window.open(url, '_blank');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar compra';
      toast.error(message);
    }
  }, [currentOrganization?.id]);

  const subscribeToPlan = useCallback(async (packageId: string): Promise<void> => {
    if (!currentOrganization?.id) {
      toast.error('Organização não selecionada');
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Você precisa estar logado');
        return;
      }

      const response = await supabase.functions.invoke('credits-subscribe', {
        body: {
          org_id: currentOrganization.id,
          package_id: packageId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.url) {
        // New subscription — redirect to checkout
        window.open(data.url, '_blank');
      } else if (data.action === 'updated') {
        toast.success('Plano atualizado com sucesso! Cobrança proporcional aplicada.');
        await fetchCredits();
        await fetchSubscription();
      } else if (data.action === 'none') {
        toast.info('Você já está neste plano.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao assinar plano';
      toast.error(message);
    }
  }, [currentOrganization?.id, fetchCredits, fetchSubscription]);

  const manageSubscription = useCallback(async (): Promise<void> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Você precisa estar logado');
        return;
      }

      const response = await supabase.functions.invoke('credits-manage', {});

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { url } = response.data;
      if (url) {
        window.open(url, '_blank');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao abrir portal';
      toast.error(message);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchCredits(), fetchSubscription()]);
  }, [fetchCredits, fetchSubscription]);

  // Defense in depth: ensure subscription.credits_per_period always reflects the
  // current package value from the pricing table, even if the DB snapshot wasn't
  // yet synced by the trigger. Source of truth = recruitment_credit_packages.credits.
  const effectiveSubscription: CreditSubscription | null = subscription
    ? (() => {
        const pkg = subscription.package_id
          ? packages.find((p) => p.id === subscription.package_id)
          : null;
        if (pkg && pkg.credits && pkg.credits !== subscription.credits_per_period) {
          return { ...subscription, credits_per_period: pkg.credits };
        }
        return subscription;
      })()
    : null;

  return {
    credits,
    costs,
    packages,
    isLoading,
    error,
    balance,
    subscription: effectiveSubscription,
    subscriptionLoading,
    getBalance,
    getCost,
    hasCredits,
    consumeCredits,
    purchaseCredits,
    subscribeToPlan,
    manageSubscription,
    refresh,
  };
}


// Kept for backward compatibility
export const CREDIT_TYPE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  universal: { label: 'Créditos', icon: 'Coins', color: 'text-amber-500' },
};

/** @deprecated No longer needed — single credit type */
export function getActiveTypesFromData(): string[] {
  return ['universal'];
}

/** @deprecated No longer needed */
export function hasPackagesForType(packages: CreditPackage[]): boolean {
  return packages.length > 0;
}

/** @deprecated No longer needed */
export const DISABLED_CREDIT_TYPES: string[] = [];

/** @deprecated No longer needed */
export function isCreditTypePurchaseDisabled(): boolean {
  return false;
}
