import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface TalentPoolFunnel {
  totalViews: number;
  uniqueProfilesViewed: number;
  totalUnlocks: number;
  contactsInitiated: number;
  interviewsScheduled: number;
  hired: number;
}

export interface TalentPoolConversionRates {
  viewToUnlock: number;
  unlockToContact: number;
  contactToInterview: number;
  interviewToHire: number;
}

export interface TalentPoolRevenue {
  totalCreditsSpent: number;
  costPerHire: number;
  creditsByWeek: { week: string; credits: number }[];
}

export interface TalentPoolTrends {
  unlocksByWeek: { week: string; count: number }[];
  hiresByWeek: { week: string; count: number }[];
}

export interface TalentPoolSourceStats {
  totalCandidatesShared: number;
  totalViewsReceived: number;
  totalUnlocksReceived: number;
  totalCreditsGenerated: number;
  hiresFromOurPool: number;
  avgUnlocksPerCandidate: number;
}

export interface TalentPoolAnalytics {
  buyer?: {
    funnel: TalentPoolFunnel;
    conversionRates: TalentPoolConversionRates;
    revenue: TalentPoolRevenue;
    trends: TalentPoolTrends;
  };
  source?: TalentPoolSourceStats;
  overview: {
    totalInPool: number;
    periodDays: number;
  };
}

export function useTalentPoolAnalytics(
  view: "buyer" | "source" | "overview" = "overview",
  periodDays: number = 30
) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ["talent-pool-analytics", currentOrganization?.id, view, periodDays],
    queryFn: async (): Promise<TalentPoolAnalytics> => {
      if (!currentOrganization?.id) {
        return { overview: { totalInPool: 0, periodDays } };
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("talent-pool-analytics", {
        body: {
          account_id: currentOrganization.id,
          view,
          period_days: periodDays,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data as TalentPoolAnalytics;
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60000, // 1 minute
  });
}

// Hook for candidate engagement (public, uses token)
export interface CandidateEngagement {
  totalViews: number;
  uniqueViewers: number;
  unlockCount: number;
  contactsReceived: number;
  viewsByWeek: { week: string; count: number }[];
  lastViewedAt: string | null;
}

export function useCandidateEngagement(token: string | null) {
  return useQuery({
    queryKey: ["candidate-engagement", token],
    queryFn: async (): Promise<CandidateEngagement | null> => {
      if (!token) return null;

      // Fetch from preferences endpoint which already validates token
      const response = await supabase.functions.invoke("get-candidate-preferences", {
        body: { token },
      });

      if (response.error) throw new Error(response.error.message);
      
      const data = response.data;
      if (!data.success || !data.stats) return null;

      return {
        totalViews: data.stats.total_views || 0,
        uniqueViewers: data.stats.unique_viewers || 0,
        unlockCount: data.stats.unlock_count || 0,
        contactsReceived: data.stats.contacts_received || 0,
        viewsByWeek: data.stats.views_by_week || [],
        lastViewedAt: data.stats.last_viewed_at || null,
      };
    },
    enabled: !!token,
    staleTime: 30000,
  });
}
