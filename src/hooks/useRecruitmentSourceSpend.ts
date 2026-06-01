import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

export type RecruitmentSourceSpendRow = {
  id: string;
  account_id: string;
  source: string;
  year: number;
  month: number;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useRecruitmentSourceSpend(params: { year: number; month: number }) {
  const { account } = useAccount();
  const accountId = account?.id;
  const qc = useQueryClient();

  const key = useMemo(
    () => ["recruitment_source_spend", { accountId, year: params.year, month: params.month }],
    [accountId, params.year, params.month]
  );

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(accountId),
    queryFn: async (): Promise<RecruitmentSourceSpendRow[]> => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("recruitment_source_spend")
        .select("*")
        .eq("account_id", accountId)
        .eq("year", params.year)
        .eq("month", params.month)
        .order("amount", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as RecruitmentSourceSpendRow[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (
      input: Partial<RecruitmentSourceSpendRow> & {
        source: string;
        amount: number;
        notes?: string | null;
      }
    ) => {
      if (!accountId) throw new Error("Conta não encontrada");

      const payload = {
        id: input.id,
        account_id: accountId,
        source: input.source,
        amount: input.amount,
        notes: input.notes ?? null,
        year: params.year,
        month: params.month,
      };

      const { data, error } = await supabase
        .from("recruitment_source_spend")
        .upsert(payload, { onConflict: "id" })
        .select("*")
        .single();

      if (error) throw error;
      return data as unknown as RecruitmentSourceSpendRow;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: key });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recruitment_source_spend").delete().eq("id", id);
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
