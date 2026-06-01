import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

/**
 * Lê o estado de Modo Demo da conta corrente.
 * Usado pelo badge global e pela tela de configurações.
 */
export function useDemoMode() {
  const { account } = useAccount();
  const accountId = account?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["account-demo-config", accountId],
    enabled: !!accountId,
    staleTime: 1000 * 60, // 1 min
    queryFn: async () => {
      if (!accountId) return null;
      const { data, error } = await supabase
        .from("account_demo_config")
        .select("demo_mode_active, activated_at, last_seed_at, demo_records_count")
        .eq("account_id", accountId)
        .maybeSingle();
      if (error) {
        console.error("useDemoMode: lookup error", error);
        return null;
      }
      return data;
    },
  });

  return {
    isDemoActive: data?.demo_mode_active === true,
    activatedAt: data?.activated_at ?? null,
    lastSeedAt: data?.last_seed_at ?? null,
    recordsCount: data?.demo_records_count ?? 0,
    loading: isLoading,
  };
}
