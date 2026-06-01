import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import { toast } from "sonner";

export type CommercialProposalStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired";

export interface CommercialProposal {
  id: string;
  account_id: string;
  cliente_id: string;
  created_by: string;
  title: string;
  scope_text: string | null;
  deliverables: unknown;
  pricing: unknown;
  payment_terms: string | null;
  validity_date: string | null;
  ai_generated_content: string | null;
  ai_model_used: string | null;
  generated_at: string | null;
  status: CommercialProposalStatus;
  public_token: string;
  sent_at: string | null;
  viewed_at: string | null;
  viewed_count: number;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  cliente?: { razao_social: string; nome_fantasia: string | null } | null;
}

export function useCommercialProposals() {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["commercial_proposals", accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_proposals")
        .select("*, cliente:clientes_consultoria(razao_social, nome_fantasia)")
        .eq("account_id", accountId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CommercialProposal[];
    },
  });

  const generate = useMutation({
    mutationFn: async (payload: {
      cliente_id: string;
      title: string;
      scope_brief: string;
      pricing_hint?: string;
      payment_terms?: string;
      validity_days?: number;
    }) => {
      if (!accountId) throw new Error("Conta não carregada");
      const { data, error } = await invokeAuthenticatedFunction<{
        success: boolean;
        proposal_id: string;
        public_token: string;
      }>("generate-commercial-proposal", { ...payload, account_id: accountId });
      if (error || !data?.success) throw new Error(error || "Falha ao gerar proposta");
      return data;
    },
    onSuccess: () => {
      toast.success("Proposta gerada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["commercial_proposals", accountId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateContent = useMutation({
    mutationFn: async ({ id, ai_generated_content }: { id: string; ai_generated_content: string }) => {
      const { error } = await supabase
        .from("commercial_proposals")
        .update({ ai_generated_content })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposta atualizada");
      queryClient.invalidateQueries({ queryKey: ["commercial_proposals", accountId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const send = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("commercial_proposals")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposta marcada como enviada");
      queryClient.invalidateQueries({ queryKey: ["commercial_proposals", accountId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commercial_proposals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposta excluída");
      queryClient.invalidateQueries({ queryKey: ["commercial_proposals", accountId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { list, generate, updateContent, send, remove };
}

export async function fetchProposalByToken(token: string) {
  const { data, error } = await supabase
    .from("commercial_proposals")
    .select("*, cliente:clientes_consultoria(razao_social, nome_fantasia, logo_url)")
    .eq("public_token", token)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as (CommercialProposal & {
    cliente: { razao_social: string; nome_fantasia: string | null; logo_url: string | null } | null;
  }) | null;
}

export async function markProposalResponse(
  token: string,
  action: "view" | "accept" | "reject",
  reason?: string,
) {
  const { data, error } = await supabase.rpc("mark_commercial_proposal_response", {
    _token: token,
    _action: action,
    _reason: reason ?? null,
  });
  if (error) throw error;
  return data as { success: boolean; proposal_id?: string; error?: string };
}
