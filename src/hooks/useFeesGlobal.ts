import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import { startOfMonth, startOfYear, endOfMonth } from "date-fns";

export interface FeeRow {
  id: string;
  account_id: string;
  vaga_id: string | null;
  cliente_id: string | null;
  valor_fee: number;
  status: string;
  data_previsao: string | null;
  data_recebimento: string | null;
  forma_recebimento: string | null;
  numero_nota_fiscal: string | null;
  observacoes: string | null;
  created_at: string;
  vaga_title?: string;
  cliente_nome?: string;
}

export const useAllFees = (filters?: { status?: string; clienteId?: string }) => {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ["fees-all", accountId, filters],
    queryFn: async (): Promise<FeeRow[]> => {
      if (!accountId) return [];
      let query = supabase
        .from("fees_historico")
        .select("*, recruitment_jobs:vaga_id(title), clientes_consultoria:cliente_id(razao_social, nome_fantasia)")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters?.clienteId) query = query.eq("cliente_id", filters.clienteId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((f: any) => ({
        ...f,
        vaga_title: f.recruitment_jobs?.title,
        cliente_nome: f.clientes_consultoria?.nome_fantasia || f.clientes_consultoria?.razao_social,
      }));
    },
    enabled: !!accountId,
  });
};

export const useFeeMetrics = () => {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ["fees-metrics", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const { data, error } = await supabase
        .from("fees_historico")
        .select("valor_fee, status, data_recebimento, data_previsao, created_at, cliente_id")
        .eq("account_id", accountId);
      if (error) throw error;

      const fees = data || [];
      const now = new Date();
      const mStart = startOfMonth(now);
      const yStart = startOfYear(now);
      const mEnd = endOfMonth(now);

      const aReceber = fees.filter(f => f.status === "a_receber").reduce((s, f) => s + (f.valor_fee || 0), 0);
      const recebidoMes = fees
        .filter(f => f.status === "recebido" && f.data_recebimento && new Date(f.data_recebimento) >= mStart && new Date(f.data_recebimento) <= mEnd)
        .reduce((s, f) => s + (f.valor_fee || 0), 0);
      const recebidoAno = fees
        .filter(f => f.status === "recebido" && f.data_recebimento && new Date(f.data_recebimento) >= yStart)
        .reduce((s, f) => s + (f.valor_fee || 0), 0);
      const recebidos = fees.filter(f => f.status === "recebido");
      const ticketMedio = recebidos.length > 0 ? recebidos.reduce((s, f) => s + (f.valor_fee || 0), 0) / recebidos.length : 0;

      const proxMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const fimProxMes = endOfMonth(proxMes);
      const previsaoProxMes = fees
        .filter(f => f.status === "a_receber" && f.data_previsao && new Date(f.data_previsao) >= proxMes && new Date(f.data_previsao) <= fimProxMes)
        .reduce((s, f) => s + (f.valor_fee || 0), 0);

      // Monthly series last 12 months
      const series: { month: string; recebido: number; previsto: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dEnd = endOfMonth(d);
        const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        const rec = fees
          .filter(f => f.status === "recebido" && f.data_recebimento && new Date(f.data_recebimento) >= d && new Date(f.data_recebimento) <= dEnd)
          .reduce((s, f) => s + (f.valor_fee || 0), 0);
        const prev = fees
          .filter(f => f.status === "a_receber" && f.data_previsao && new Date(f.data_previsao) >= d && new Date(f.data_previsao) <= dEnd)
          .reduce((s, f) => s + (f.valor_fee || 0), 0);
        series.push({ month: label, recebido: rec, previsto: prev });
      }

      // By client
      const clienteMap = new Map<string, number>();
      for (const f of fees.filter(x => x.status === "recebido" && x.cliente_id)) {
        clienteMap.set(f.cliente_id!, (clienteMap.get(f.cliente_id!) || 0) + (f.valor_fee || 0));
      }

      // Próximos 30 dias a receber
      const in30 = new Date(now);
      in30.setDate(in30.getDate() + 30);
      const proximosFees = fees
        .filter(f => f.status === "a_receber" && f.data_previsao && new Date(f.data_previsao) >= now && new Date(f.data_previsao) <= in30)
        .sort((a, b) => new Date(a.data_previsao!).getTime() - new Date(b.data_previsao!).getTime());

      return { aReceber, recebidoMes, recebidoAno, ticketMedio, previsaoProxMes, series, clienteMap, proximosFees };
    },
    enabled: !!accountId,
  });
};

export const useMarkFeeReceivedDetailed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; data_recebimento: string; forma_recebimento: string; numero_nota_fiscal?: string }) => {
      const { error } = await supabase
        .from("fees_historico")
        .update({
          status: "recebido",
          data_recebimento: params.data_recebimento,
          forma_recebimento: params.forma_recebimento,
          numero_nota_fiscal: params.numero_nota_fiscal || null,
        })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees-history"] });
      queryClient.invalidateQueries({ queryKey: ["fees-all"] });
      queryClient.invalidateQueries({ queryKey: ["fees-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["client-stats"] });
      toast.success("Fee marcado como recebido");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
};

export const useUpdateFee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; valor_fee?: number; data_previsao?: string; observacoes?: string; status?: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from("fees_historico").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees-history"] });
      queryClient.invalidateQueries({ queryKey: ["fees-all"] });
      queryClient.invalidateQueries({ queryKey: ["fees-metrics"] });
      toast.success("Fee atualizado");
    },
  });
};
