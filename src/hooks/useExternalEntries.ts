import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";

export interface ExternalEntry {
  id: string;
  account_id: string;
  channel: "whatsapp" | "email";
  sender: string;
  sender_name: string | null;
  subject: string | null;
  raw_content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  processing_status: "pending" | "processing" | "completed" | "failed" | "duplicate" | "ignored";
  candidate_id: string | null;
  error_message: string | null;
  extracted_data: any;
  retry_count: number;
  received_at: string;
  processed_at: string | null;
  created_at: string;
}

export interface ExternalEntriesFilters {
  channel?: "whatsapp" | "email" | "all";
  status?: string;
  search?: string;
}

export function useExternalEntries(filters: ExternalEntriesFilters = {}) {
  const { currentAccount } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ["external-entries", currentAccount?.id, filters],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      let query = (supabase as any)
        .from("candidate_external_entries")
        .select("*")
        .eq("account_id", currentAccount.id)
        .order("received_at", { ascending: false })
        .limit(100);

      if (filters.channel && filters.channel !== "all") query = query.eq("channel", filters.channel);
      if (filters.status && filters.status !== "all") query = query.eq("processing_status", filters.status);
      if (filters.search) query = query.or(`sender.ilike.%${filters.search}%,sender_name.ilike.%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ExternalEntry[];
    },
    enabled: !!currentAccount?.id,
  });

  const reprocessMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.functions.invoke("process-external-entry", {
        body: { entry_id: entryId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-entries"] });
      toast({ title: "Reprocessamento iniciado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const metrics = {
    total: entriesQuery.data?.length || 0,
    pending: entriesQuery.data?.filter((e) => e.processing_status === "pending" || e.processing_status === "processing").length || 0,
    completed: entriesQuery.data?.filter((e) => e.processing_status === "completed").length || 0,
    failed: entriesQuery.data?.filter((e) => e.processing_status === "failed").length || 0,
    duplicates: entriesQuery.data?.filter((e) => e.processing_status === "duplicate").length || 0,
    whatsapp: entriesQuery.data?.filter((e) => e.channel === "whatsapp").length || 0,
    email: entriesQuery.data?.filter((e) => e.channel === "email").length || 0,
  };

  return {
    entries: entriesQuery.data || [],
    isLoading: entriesQuery.isLoading,
    metrics,
    reprocess: reprocessMutation.mutate,
    isReprocessing: reprocessMutation.isPending,
  };
}

export function useEmailIntakeConfig() {
  const { currentAccount } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ["email-intake-config", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return null;
      const { data, error } = await (supabase as any)
        .from("email_intake_config")
        .select("*")
        .eq("account_id", currentAccount.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentAccount?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!configQuery.data) throw new Error("No config");
      const { error } = await (supabase as any)
        .from("email_intake_config")
        .update({ is_active: isActive })
        .eq("id", configQuery.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-intake-config"] });
      toast({ title: "Configuração atualizada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    toggleActive: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
  };
}
