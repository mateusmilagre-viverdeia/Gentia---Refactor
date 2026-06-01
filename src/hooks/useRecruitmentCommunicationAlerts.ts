import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAccount } from "@/hooks/useAccount";

export type CommunicationAlertSeverity = "info" | "warning" | "critical";

export interface RecruitmentCommunicationAlert {
  id: string;
  account_id: string;
  severity: CommunicationAlertSeverity;
  rule_id: string;
  title: string;
  description: string;
  stats_snapshot: unknown;
  created_at: string;
  resolved_at: string | null;
}

export function useRecruitmentCommunicationAlerts() {
  const { currentAccount } = useOrganization();
  const { canManageRH } = useAccount();
  const queryClient = useQueryClient();

  const accountId = currentAccount?.id;
  const enabled = Boolean(accountId && canManageRH);

  const query = useQuery({
    queryKey: ["recruitment-communication-alerts", accountId],
    enabled,
    queryFn: async (): Promise<RecruitmentCommunicationAlert[]> => {
      if (!accountId) return [];
      // NOTE: keep this hook resilient even if generated DB typings haven't been refreshed yet.
      const sb = supabase as any;
      const { data, error } = await sb
        .from("recruitment_communication_alerts")
        .select("id, account_id, severity, rule_id, title, description, stats_snapshot, created_at, resolved_at")
        .eq("account_id", accountId)
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as RecruitmentCommunicationAlert[];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const sb = supabase as any;
      const { error } = await sb
        .from("recruitment_communication_alerts")
        .update({ resolved_at: new Date().toISOString() })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recruitment-communication-alerts", accountId] });
    },
  });

  const count = useMemo(() => query.data?.length || 0, [query.data]);

  return {
    alerts: query.data || [],
    count,
    isLoading: query.isLoading,
    canSee: enabled,
    resolveAlert: resolveMutation.mutateAsync,
    resolving: resolveMutation.isPending,
  };
}
