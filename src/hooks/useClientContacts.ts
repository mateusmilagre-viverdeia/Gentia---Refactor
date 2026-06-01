import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClientContact {
  id: string;
  account_id: string;
  cliente_id: string;
  nome: string;
  cargo: string | null;
  email: string | null;
  whatsapp: string | null;
  eh_decisor: boolean;
  eh_contato_principal: boolean;
  created_at: string;
}

export const useClientContacts = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ["client-contacts", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("clientes_contatos")
        .select("*")
        .eq("cliente_id", clientId)
        .order("eh_contato_principal", { ascending: false });
      if (error) throw error;
      return data as ClientContact[];
    },
    enabled: !!clientId,
  });
};

export const useSaveContacts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      accountId,
      contacts,
    }: {
      clientId: string;
      accountId: string;
      contacts: Omit<ClientContact, "id" | "account_id" | "cliente_id" | "created_at">[];
    }) => {
      // Delete existing and re-insert
      await supabase.from("clientes_contatos").delete().eq("cliente_id", clientId);

      if (contacts.length === 0) return [];

      const rows = contacts.map((c) => ({
        ...c,
        account_id: accountId,
        cliente_id: clientId,
      }));

      const { data, error } = await supabase
        .from("clientes_contatos")
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["client-contacts", vars.clientId] });
    },
    onError: (error) => {
      toast.error("Erro ao salvar contatos: " + error.message);
    },
  });
};
