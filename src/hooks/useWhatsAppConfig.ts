import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";

export interface WhatsAppConfig {
  id: string;
  account_id: string;
  phone_number_id: string;
  waba_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type WhatsAppConfigInput = {
  phone_number_id: string;
  waba_id: string | null;
  access_token: string;
  is_active: boolean;
};

export function useWhatsAppConfig() {
  const { currentAccount } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ["whatsapp-config", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return null;
      const { data, error } = await (supabase as any)
        .from("recruitment_whatsapp_config")
        .select("id, account_id, phone_number_id, waba_id, is_active, created_at, updated_at")
        .eq("account_id", currentAccount.id)
        .maybeSingle();
      if (error) throw error;
      return data as WhatsAppConfig | null;
    },
    enabled: !!currentAccount?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: WhatsAppConfigInput) => {
      if (!currentAccount?.id) throw new Error("No account");
      const result = await invokeAuthenticatedFunction<{ success: boolean; message?: string; error?: string }>("whatsapp-config", {
        action: "save",
        accountId: currentAccount.id,
        phoneNumberId: input.phone_number_id,
        wabaId: input.waba_id,
        accessToken: input.access_token,
        isActive: input.is_active,
      });

      if (result.error || !result.data?.success) {
        throw new Error(result.data?.error || result.error || "Erro ao salvar WhatsApp");
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
      toast({ title: "Configuração salva", description: "Integração WhatsApp validada e atualizada." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!currentAccount?.id) throw new Error("No account");
      const result = await invokeAuthenticatedFunction<{ success: boolean; message?: string; error?: string }>("whatsapp-config", {
        action: "test",
        accountId: currentAccount.id,
      });

      if (result.error || !result.data?.success) {
        throw new Error(result.data?.error || result.error || "Falha na conexão");
      }

      return result.data;
    },
    onSuccess: (data) => {
      toast({ title: "Conexão ativa", description: data.message || "WhatsApp respondeu corretamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Falha na conexão", description: error.message, variant: "destructive" });
    },
  });

  return {
    config: configQuery.data ?? null,
    isLoading: configQuery.isLoading,
    upsertConfig: upsertMutation.mutate,
    testConnection: testMutation.mutate,
    isSaving: upsertMutation.isPending,
    isTesting: testMutation.isPending,
  };
}
