import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AccountHealthScore = {
  id: string;
  account_id: string;
  usage_score: number;
  adoption_score: number;
  engagement_score: number;
  ai_consumption_score: number;
  billing_score: number;
  nps_score: number;
  overall_score: number;
  health_status: "green" | "yellow" | "red";
  indicators_detail: Record<string, any>;
  calculated_at: string;
  created_at: string;
  updated_at: string;
};

export type AccountHealthRow = AccountHealthScore & {
  company_name: string | null;
  company_sector: string | null;
};

export function useAccountHealthList() {
  return useQuery({
    queryKey: ["admin-account-health-list"],
    queryFn: async () => {
      // Buscar todas as companies + health scores (left join feito client-side)
      const [companiesRes, scoresRes] = await Promise.all([
        supabase.from("companies").select("id, name, sector"),
        supabase.from("account_health_scores").select("*"),
      ]);

      if (companiesRes.error) throw companiesRes.error;
      if (scoresRes.error) throw scoresRes.error;

      const scoreMap = new Map<string, AccountHealthScore>();
      for (const s of (scoresRes.data ?? []) as AccountHealthScore[]) {
        scoreMap.set(s.account_id, s);
      }

      const rows: AccountHealthRow[] = (companiesRes.data ?? []).map((c: any) => {
        const score = scoreMap.get(c.id);
        return {
          id: score?.id ?? `pending-${c.id}`,
          account_id: c.id,
          usage_score: score?.usage_score ?? 0,
          adoption_score: score?.adoption_score ?? 0,
          engagement_score: score?.engagement_score ?? 0,
          ai_consumption_score: score?.ai_consumption_score ?? 0,
          billing_score: score?.billing_score ?? 0,
          nps_score: score?.nps_score ?? 0,
          overall_score: score?.overall_score ?? 0,
          health_status: (score?.health_status ?? "yellow") as
            | "green"
            | "yellow"
            | "red",
          indicators_detail: score?.indicators_detail ?? {},
          calculated_at: score?.calculated_at ?? "",
          created_at: score?.created_at ?? "",
          updated_at: score?.updated_at ?? "",
          company_name: c.name ?? null,
          company_sector: c.sector ?? null,
        };
      });

      return rows;
    },
  });
}

export function useRecalculateAccountHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { account_id?: string; all?: boolean }) => {
      const { data, error } = await supabase.functions.invoke(
        "calculate-account-health",
        { body: params },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-account-health-list"] });
      if (vars.all) {
        toast.success(
          `Recalculadas ${data?.processed ?? 0} contas${data?.failed ? ` (${data.failed} falhas)` : ""}`,
        );
      } else {
        toast.success("Saúde da conta recalculada");
      }
    },
    onError: (e: any) => {
      toast.error("Falha ao recalcular saúde", {
        description: e?.message ?? "Erro desconhecido",
      });
    },
  });
}
