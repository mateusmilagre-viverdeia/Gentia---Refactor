import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface Client {
  id: string;
  account_id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  setor: string | null;
  porte: string | null;
  site: string | null;
  logo_url: string | null;
  status: string;
  fee_percentual: number | null;
  fee_fixo: number | null;
  modelo_fee: string | null;
  prazo_garantia_dias: number | null;
  prazo_entrega_dias: number | null;
  responsavel_interno: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientInsert = Omit<Client, "id" | "created_at" | "updated_at">;
export type ClientUpdate = Partial<ClientInsert>;

export const useClients = (filters?: { status?: string; search?: string }) => {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ["clients", accountId, filters],
    queryFn: async () => {
      if (!accountId) return [];
      let query = supabase
        .from("clientes_consultoria")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.search) {
        query = query.or(
          `razao_social.ilike.%${filters.search}%,nome_fantasia.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!accountId,
  });
};

export const useClient = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("clientes_consultoria")
        .select("*")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!clientId,
  });
};

export const useClientStats = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ["client-stats", clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const [jobsOpen, jobsClosed, fees] = await Promise.all([
        supabase
          .from("recruitment_jobs")
          .select("id", { count: "exact", head: true })
          .eq("cliente_id", clientId)
          .eq("status", "active"),
        supabase
          .from("recruitment_jobs")
          .select("id", { count: "exact", head: true })
          .eq("cliente_id", clientId)
          .in("status", ["closed", "filled"]),
        supabase
          .from("fees_historico")
          .select("valor_fee, status")
          .eq("cliente_id", clientId),
      ]);

      const feesData = fees.data || [];
      const totalRecebido = feesData
        .filter((f) => f.status === "recebido")
        .reduce((sum, f) => sum + (f.valor_fee || 0), 0);
      const totalAReceber = feesData
        .filter((f) => f.status === "a_receber")
        .reduce((sum, f) => sum + (f.valor_fee || 0), 0);

      return {
        vagasAbertas: jobsOpen.count || 0,
        vagasFechadas: jobsClosed.count || 0,
        totalRecebido,
        totalAReceber,
      };
    },
    enabled: !!clientId,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data, error } = await supabase
        .from("clientes_consultoria")
        .insert(client)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente criado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao criar cliente: " + error.message);
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("clientes_consultoria")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", data.id] });
      toast.success("Cliente atualizado com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar cliente: " + error.message);
    },
  });
};
