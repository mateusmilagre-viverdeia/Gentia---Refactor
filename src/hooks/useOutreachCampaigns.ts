import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface OutreachCampaign {
  id: string;
  account_id: string;
  job_id: string | null;
  name: string;
  description: string | null;
  target_source: string;
  target_filters: Record<string, unknown> | null;
  initial_message_template: string;
  follow_up_templates: unknown[] | null;
  ai_persona: string | null;
  auto_reply_enabled: boolean;
  max_auto_replies: number;
  reply_delay_minutes: number;
  max_contacts: number;
  daily_send_limit: number;
  contacts_queued: number;
  contacts_sent: number;
  responses_received: number;
  interested_count: number;
  converted_count: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  recruitment_jobs?: {
    title: string;
  } | null;
}

export interface OutreachConversation {
  id: string;
  campaign_id: string;
  account_id: string;
  candidate_id: string | null;
  hunting_result_id: string | null;
  talent_pool_id: string | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  status: string;
  interest_score: number | null;
  interest_reason: string | null;
  messages: ConversationMessage[] | null;
  ai_context: Record<string, unknown> | null;
  ai_replies_count: number;
  last_message_at: string | null;
  last_response_at: string | null;
  converted_at: string | null;
  opted_out_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  type: "outbound" | "inbound";
  content: string;
  status: string;
  created_at: string;
  sent_at?: string;
  zapi_id?: string;
}

export function useOutreachCampaigns() {
  const { currentOrganization } = useOrganization();
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!currentOrganization?.id) {
      setCampaigns([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("recruitment_outreach_campaigns")
        .select(`
          *,
          recruitment_jobs (
            title
          )
        `)
        .eq("account_id", currentOrganization.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setCampaigns((data as unknown as OutreachCampaign[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar campanhas";
      setError(message);
      console.error("Error fetching campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = useCallback(async (data: {
    name: string;
    description?: string | null;
    job_id?: string | null;
    target_source: string;
    max_contacts: number;
    initial_message_template: string;
    ai_persona?: string | null;
    auto_reply_enabled: boolean;
    max_auto_replies: number;
    reply_delay_minutes: number;
    daily_send_limit: number;
    ab_enabled?: boolean;
    ab_variant_b_template?: string;
    channel?: "whatsapp" | "email";
    from_email?: string | null;
    from_name?: string | null;
    subject_template?: string | null;
    body_html_template?: string | null;
  }) => {
    if (!currentOrganization?.id) {
      toast.error("Organização não selecionada");
      return null;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const basePayload = {
        name: data.name,
        description: data.description,
        job_id: data.job_id,
        target_source: data.target_source,
        max_contacts: data.max_contacts,
        ai_persona: data.ai_persona,
        auto_reply_enabled: data.auto_reply_enabled,
        max_auto_replies: data.max_auto_replies,
        reply_delay_minutes: data.reply_delay_minutes,
        daily_send_limit: data.daily_send_limit,
        account_id: currentOrganization.id,
        created_by: session.session?.user?.id,
        channel: data.channel ?? "whatsapp",
        from_email: data.from_email ?? null,
        from_name: data.from_name ?? null,
        subject_template: data.subject_template ?? null,
        body_html_template: data.body_html_template ?? null,
      };

      if (data.ab_enabled && data.ab_variant_b_template) {
        // Create A/B pair with shared group ID
        const abGroupId = crypto.randomUUID();

        const { data: campaignA, error: errA } = await supabase
          .from("recruitment_outreach_campaigns")
          .insert({
            ...basePayload,
            name: `${data.name} (Variante A)`,
            initial_message_template: data.initial_message_template,
            ab_variant: 'A',
            ab_group_id: abGroupId,
            max_contacts: Math.ceil(data.max_contacts / 2),
          } as any)
          .select()
          .single();
        if (errA) throw errA;

        const { error: errB } = await supabase
          .from("recruitment_outreach_campaigns")
          .insert({
            ...basePayload,
            name: `${data.name} (Variante B)`,
            initial_message_template: data.ab_variant_b_template,
            ab_variant: 'B',
            ab_group_id: abGroupId,
            max_contacts: Math.floor(data.max_contacts / 2),
          } as any)
          .select()
          .single();
        if (errB) throw errB;

        await fetchCampaigns();
        toast.success("Teste A/B criado com sucesso! 2 campanhas geradas.");
        return campaignA;
      }

      // Normal single campaign
      const { data: newCampaign, error } = await supabase
        .from("recruitment_outreach_campaigns")
        .insert({
          ...basePayload,
          initial_message_template: data.initial_message_template,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchCampaigns();
      toast.success("Campanha criada com sucesso!");
      return newCampaign;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar campanha";
      toast.error(message);
      return null;
    }
  }, [currentOrganization?.id, fetchCampaigns]);

  const updateCampaign = useCallback(async (id: string, data: { status?: string }) => {
    try {
      const { error } = await supabase
        .from("recruitment_outreach_campaigns")
        .update(data)
        .eq("id", id);

      if (error) throw error;

      await fetchCampaigns();
      toast.success("Campanha atualizada!");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar campanha";
      toast.error(message);
      return false;
    }
  }, [fetchCampaigns]);

  const startCampaign = useCallback(async (campaignId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("Você precisa estar logado");
        return false;
      }

      const { data, error } = await supabase.functions.invoke("outreach-campaign-start", {
        body: { campaign_id: campaignId },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error === "insufficient_credits") {
          toast.error(`Créditos insuficientes. Necessário: ${data.required}, Disponível: ${data.available}`);
        } else {
          toast.error(data.message || data.error);
        }
        return false;
      }

      await fetchCampaigns();
      toast.success(`Campanha iniciada! ${data.contacts_queued} contatos na fila.`);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao iniciar campanha";
      toast.error(message);
      return false;
    }
  }, [fetchCampaigns]);

  const pauseCampaign = useCallback(async (campaignId: string) => {
    return updateCampaign(campaignId, { status: "paused" });
  }, [updateCampaign]);

  const resumeCampaign = useCallback(async (campaignId: string) => {
    return updateCampaign(campaignId, { status: "running" });
  }, [updateCampaign]);

  const deleteCampaign = useCallback(async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from("recruitment_outreach_campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;

      await fetchCampaigns();
      toast.success("Campanha excluída!");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao excluir campanha";
      toast.error(message);
      return false;
    }
  }, [fetchCampaigns]);

  const processQueue = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("outreach-queue-processor", {
        body: { triggered_at: new Date().toISOString() },
      });

      if (error) throw error;

      if (data?.processed > 0) {
        toast.success(`Processado: ${data.success} enviadas, ${data.failed} falharam`);
      } else {
        toast.info("Nenhuma mensagem pendente na fila");
      }
      
      await fetchCampaigns();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar fila";
      toast.error(message);
      return null;
    }
  }, [fetchCampaigns]);

  return {
    campaigns,
    isLoading,
    error,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    deleteCampaign,
    processQueue,
  };
}

export function useOutreachConversations(campaignId?: string) {
  const { currentOrganization } = useOrganization();
  const [conversations, setConversations] = useState<OutreachConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!currentOrganization?.id || !campaignId) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("recruitment_outreach_conversations")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setConversations((data as unknown as OutreachConversation[]) || []);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, campaignId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const generateReply = useCallback(async (conversationId: string, customPrompt?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("outreach-generate-reply", {
        body: { conversation_id: conversationId, custom_prompt: customPrompt },
      });

      if (error) throw error;
      return data?.suggested_reply || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao gerar resposta";
      toast.error(message);
      return null;
    }
  }, []);

  const sendManualReply = useCallback(async (conversationId: string, message: string) => {
    if (!currentOrganization?.id) return false;

    try {
      // Get conversation
      const { data: conv, error: convError } = await supabase
        .from("recruitment_outreach_conversations")
        .select("contact_phone, messages, account_id")
        .eq("id", conversationId)
        .single();

      if (convError || !conv) throw new Error("Conversa não encontrada");

      // Send via WhatsApp
      const { error: sendError } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          toPhoneE164: conv.contact_phone,
          message: message,
        },
      });

      if (sendError) throw sendError;

      // Update conversation
      const existingMessages = Array.isArray(conv.messages) ? conv.messages : [];
      const updatedMessages = [
        ...existingMessages,
        {
          id: crypto.randomUUID(),
          type: "outbound",
          content: message,
          status: "sent",
          created_at: new Date().toISOString(),
        },
      ];

      await supabase
        .from("recruitment_outreach_conversations")
        .update({
          messages: updatedMessages,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      await fetchConversations();
      toast.success("Mensagem enviada!");
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao enviar mensagem";
      toast.error(message);
      return false;
    }
  }, [currentOrganization?.id, fetchConversations]);

  const updateConversationStatus = useCallback(async (conversationId: string, status: string) => {
    try {
      const updateData: Record<string, unknown> = { status };
      if (status === "converted") {
        updateData.converted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("recruitment_outreach_conversations")
        .update(updateData)
        .eq("id", conversationId);

      if (error) throw error;

      await fetchConversations();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar status";
      toast.error(message);
      return false;
    }
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    fetchConversations,
    generateReply,
    sendManualReply,
    updateConversationStatus,
  };
}
