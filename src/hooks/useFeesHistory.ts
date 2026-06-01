import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FeeHistory {
  id: string;
  account_id: string;
  vaga_id: string | null;
  cliente_id: string | null;
  valor_fee: number;
  status: string;
  data_previsao: string | null;
  data_recebimento: string | null;
  observacoes: string | null;
  created_at: string;
}

export const useFeesHistory = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ["fees-history", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("fees_historico")
        .select("*")
        .eq("cliente_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FeeHistory[];
    },
    enabled: !!clientId,
  });
};

export const useMarkFeeReceived = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feeId: string) => {
      const { error } = await supabase
        .from("fees_historico")
        .update({ status: "recebido", data_recebimento: new Date().toISOString() })
        .eq("id", feeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees-history"] });
      queryClient.invalidateQueries({ queryKey: ["client-stats"] });
      toast.success("Fee marcado como recebido");
    },
  });
};
