import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useEmployerAccount(clientId: string, agencyAccountId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["employer-account", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data: employer } = await supabase
        .from("companies")
        .select("id, name, created_at, user_id")
        .eq("account_type", "employer")
        .eq("employer_linked_client_id", clientId)
        .maybeSingle();

      if (!employer) return null;

      const { data: member } = await supabase
        .from("account_members")
        .select("last_access_at")
        .eq("account_id", employer.id)
        .eq("user_id", employer.user_id)
        .eq("is_active", true)
        .maybeSingle();

      return { ...employer, last_access_at: member?.last_access_at || null };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (params: { contact_email: string; contact_name?: string; contact_id?: string }) => {
      const { data, error } = await supabase.functions.invoke("employer-account-create", {
        body: {
          agency_account_id: agencyAccountId,
          client_id: clientId,
          ...params,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.exists) {
        toast.success(data?.magic_link_sent ? `Convite reenviado para ${data.invited_email || "o contato"}` : "Conta Employer já existia; acesso reativado");
      } else {
        toast.success(data?.magic_link_sent ? `Conta Employer criada e convite enviado para ${data.invited_email || "o contato"}` : "Conta Employer criada; não foi possível enviar o link automático");
      }
      qc.invalidateQueries({ queryKey: ["employer-account", clientId] });
      qc.invalidateQueries({ queryKey: ["client-contacts", clientId] });
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível criar ou reenviar o convite Employer"),
  });

  return { ...query, createEmployer: createMutation.mutate, isCreating: createMutation.isPending };
}
