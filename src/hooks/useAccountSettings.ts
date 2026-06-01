import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AccountSettings {
  id: string;
  account_id: string;
  sla_meta_dias: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SLA_META = 30;

export function useAccountSettings(accountId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["account-settings", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const { data, error } = await (supabase as any)
        .from("account_settings")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();
      if (error) throw error;
      return data as AccountSettings | null;
    },
    enabled: !!accountId,
  });

  const upsert = useMutation({
    mutationFn: async (patch: Partial<Pick<AccountSettings, "sla_meta_dias">>) => {
      if (!accountId) throw new Error("accountId is required");
      const { data, error } = await (supabase as any)
        .from("account_settings")
        .upsert(
          { account_id: accountId, ...patch },
          { onConflict: "account_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as AccountSettings;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      queryClient.invalidateQueries({ queryKey: ["account-settings", accountId] });
    },
    onError: (e: any) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  return {
    settings: query.data,
    slaMetaDias: query.data?.sla_meta_dias ?? DEFAULT_SLA_META,
    isLoading: query.isLoading,
    update: upsert.mutateAsync,
    isUpdating: upsert.isPending,
  };
}
