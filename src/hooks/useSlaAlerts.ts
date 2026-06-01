import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface SlaAlert {
  id: string;
  account_id: string;
  vaga_id: string | null;
  tipo_alerta: string;
  dias_restantes: number | null;
  status: string;
  resolucao_nota: string | null;
  responsavel_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlaAlertWithJob extends SlaAlert {
  job_title?: string;
  cliente_nome?: string;
}

export const useSlaAlerts = (filters?: { status?: string }) => {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ["sla-alerts", accountId, filters],
    queryFn: async (): Promise<SlaAlertWithJob[]> => {
      if (!accountId) return [];
      let query = supabase
        .from("sla_alertas")
        .select("*, recruitment_jobs:vaga_id(title, cliente_id, clientes_consultoria:cliente_id(razao_social, nome_fantasia))")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        job_title: row.recruitment_jobs?.title,
        cliente_nome:
          row.recruitment_jobs?.clientes_consultoria?.nome_fantasia ||
          row.recruitment_jobs?.clientes_consultoria?.razao_social ||
          null,
      }));
    },
    enabled: !!accountId,
  });
};

export const useUpdateSlaAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, resolucao_nota }: { id: string; status: string; resolucao_nota?: string }) => {
      const { error } = await supabase
        .from("sla_alertas")
        .update({ status, ...(resolucao_nota ? { resolucao_nota } : {}) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-alerts"] });
      toast.success("Alerta atualizado");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
};

export const useTriggerSlaMonitor = () => {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sla-monitor", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`SLA atualizado: ${data?.sla?.slaUpdated || 0} vagas, ${data?.sla?.alertsCreated || 0} alertas novos`);
    },
    onError: (e: any) => toast.error("Erro ao executar monitor: " + e.message),
  });
};
