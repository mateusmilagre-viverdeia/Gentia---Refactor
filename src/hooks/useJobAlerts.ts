import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface JobAlertSubscription {
  id: string;
  account_id: string;
  email: string;
  departments: string[];
  is_active: boolean;
  created_at: string;
}

export interface CreateJobAlertInput {
  account_id: string;
  email: string;
  departments?: string[];
}

/**
 * Hook to fetch job alert subscriptions for an organization (admin view)
 */
export function useJobAlertSubscriptions(accountId: string | undefined) {
  return useQuery({
    queryKey: ["job-alerts", accountId],
    queryFn: async (): Promise<JobAlertSubscription[]> => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("job_alert_subscriptions")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!accountId,
  });
}

/**
 * Hook to subscribe to job alerts (public)
 */
export function useSubscribeToJobAlerts() {
  return useMutation({
    mutationFn: async (input: CreateJobAlertInput) => {
      const { data, error } = await supabase
        .from("job_alert_subscriptions")
        .insert(input)
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505') {
          throw new Error("Este email já está cadastrado para alertas.");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Inscrição realizada! Você receberá alertas de novas vagas.");
    },
    onError: (error: Error) => {
      console.error("Error subscribing to alerts:", error);
      toast.error(error.message || "Erro ao se inscrever. Tente novamente.");
    },
  });
}

/**
 * Hook to delete job alert subscription
 */
export function useDeleteJobAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, accountId }: { id: string; accountId: string }) => {
      const { error } = await supabase
        .from("job_alert_subscriptions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["job-alerts", variables.accountId] });
      toast.success("Inscrição removida!");
    },
    onError: (error) => {
      console.error("Error deleting subscription:", error);
      toast.error("Erro ao remover inscrição");
    },
  });
}
