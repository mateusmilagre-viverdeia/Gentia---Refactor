import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

export type RecruitmentHeadcountPlanRow = {
  id: string;
  account_id: string;
  year: number;
  month: number;
  planned_hires: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useRecruitmentHeadcountPlan(params: { year: number; month: number }) {
  const { account } = useAccount();
  const accountId = account?.id;
  const qc = useQueryClient();

  const key = useMemo(
    () => ["recruitment_headcount_plan", { accountId, year: params.year, month: params.month }],
    [accountId, params.year, params.month]
  );

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(accountId),
    queryFn: async (): Promise<RecruitmentHeadcountPlanRow[]> => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("recruitment_headcount_plan")
        .select("*")
        .eq("account_id", accountId)
        .eq("year", params.year)
        .eq("month", params.month)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as RecruitmentHeadcountPlanRow[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: {
      id?: string;
      planned_hires: number;
      notes?: string | null;
    }) => {
      if (!accountId) throw new Error("Conta não encontrada");

      const payload = {
        id: input.id,
        account_id: accountId,
        year: params.year,
        month: params.month,
        planned_hires: input.planned_hires,
        notes: input.notes ?? null,
      };

      const { data, error } = await supabase
        .from("recruitment_headcount_plan")
        .upsert(payload, { onConflict: "id" })
        .select("*")
        .single();

      if (error) throw error;
      return data as unknown as RecruitmentHeadcountPlanRow;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: key });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recruitment_headcount_plan").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: key });
    },
  });

  return {
    ...query,
    upsert,
    remove,
  };
}
