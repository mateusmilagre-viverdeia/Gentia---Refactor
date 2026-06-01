import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type MessageChannel = "email" | "whatsapp";
export type MessageType = "disc_invite" | "disc_reminder" | "workflow_advance" | "workflow_complete" | "talent_pool_entry";

export interface RecruitmentMessageTemplate {
  id: string;
  account_id: string;
  channel: MessageChannel;
  message_type: MessageType;
  reminder_day: number | null;
  name: string;
  subject: string | null;
  body: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TEMPLATES: Omit<
  RecruitmentMessageTemplate,
  "id" | "account_id" | "created_at" | "updated_at"
>[] = [
  // DISC invite
  {
    channel: "email",
    message_type: "disc_invite",
    reminder_day: null,
    name: "Convite DISC (Email)",
    subject: "Avaliação DISC - {{company_name}} - {{job_title}}",
    body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#111;max-width:640px;margin:0 auto;padding:20px;">
  <h2 style="margin:0 0 16px;">Avaliação comportamental DISC</h2>
  <p>Olá {{candidate_name}},</p>
  <p>Você foi convidado(a) para participar da avaliação DISC para a vaga <strong>{{job_title}}</strong> na <strong>{{company_name}}</strong>.</p>
  <p><a href="{{assessment_url}}">Iniciar avaliação</a></p>
  <p style="font-size:12px;color:#666;">Se o link não funcionar, copie e cole: {{assessment_url}}</p>
</body>
</html>`,
    is_default: true,
    is_active: true,
  },
  {
    channel: "whatsapp",
    message_type: "disc_invite",
    reminder_day: null,
    name: "Convite DISC (WhatsApp)",
    subject: null,
    body: `Olá, {{candidate_name}}!\n\nVocê foi convidado(a) para realizar a avaliação comportamental DISC para a vaga *{{job_title}}* na *{{company_name}}*.\n\nAcesse o link (válido por 7 dias):\n{{assessment_url}}`,
    is_default: true,
    is_active: true,
  },

  // DISC reminders (D+1/D+3/D+5)
  {
    channel: "email",
    message_type: "disc_reminder",
    reminder_day: 1,
    name: "Lembrete DISC D+1 (Email)",
    subject: "Lembrete: complete sua avaliação DISC ({{company_name}})",
    body: `<p>Olá {{candidate_name}},</p><p>Sua avaliação DISC para a vaga <strong>{{job_title}}</strong> na <strong>{{company_name}}</strong> ainda está pendente.</p><p><a href="{{assessment_url}}">Continuar avaliação</a></p>`,
    is_default: true,
    is_active: true,
  },
  {
    channel: "email",
    message_type: "disc_reminder",
    reminder_day: 3,
    name: "Lembrete DISC D+3 (Email)",
    subject: "Sua avaliação DISC está pendente - {{company_name}}",
    body: `<p>Olá {{candidate_name}},</p><p>Sua avaliação DISC para a vaga <strong>{{job_title}}</strong> na <strong>{{company_name}}</strong> ainda está pendente.</p><p><a href="{{assessment_url}}">Continuar avaliação</a></p>`,
    is_default: true,
    is_active: true,
  },
  {
    channel: "email",
    message_type: "disc_reminder",
    reminder_day: 5,
    name: "Lembrete DISC D+5 (Email)",
    subject: "Último lembrete: sua avaliação DISC expira em breve ({{company_name}})",
    body: `<p>Olá {{candidate_name}},</p><p><strong>Último lembrete</strong>: sua avaliação DISC para a vaga <strong>{{job_title}}</strong> na <strong>{{company_name}}</strong> expira em breve.</p><p><a href="{{assessment_url}}">Continuar avaliação</a></p>`,
    is_default: true,
    is_active: true,
  },
  {
    channel: "whatsapp",
    message_type: "disc_reminder",
    reminder_day: 1,
    name: "Lembrete DISC D+1 (WhatsApp)",
    subject: null,
    body: `Oi {{candidate_name}}! Você ainda não completou sua avaliação DISC para a vaga *{{job_title}}* na *{{company_name}}*.\n\nLeva apenas alguns minutos. Acesse: {{assessment_url}}`,
    is_default: true,
    is_active: true,
  },
  {
    channel: "whatsapp",
    message_type: "disc_reminder",
    reminder_day: 3,
    name: "Lembrete DISC D+3 (WhatsApp)",
    subject: null,
    body: `Olá {{candidate_name}}, sua avaliação DISC ainda está pendente para a vaga *{{job_title}}* na *{{company_name}}*.\n\nComplete agora: {{assessment_url}}`,
    is_default: true,
    is_active: true,
  },
  {
    channel: "whatsapp",
    message_type: "disc_reminder",
    reminder_day: 5,
    name: "Lembrete DISC D+5 (WhatsApp)",
    subject: null,
    body: `Último lembrete: sua avaliação DISC para a vaga *{{job_title}}* na *{{company_name}}* expira em breve.\n\nAcesse: {{assessment_url}}`,
    is_default: true,
    is_active: true,
  },
];

export function replaceMessageTemplateVariables(
  template: string,
  variables: {
    candidate_name?: string;
    job_title?: string;
    company_name?: string;
    assessment_url?: string;
    custom_message?: string;
  }
): string {
  let result = template;
  const entries = Object.entries(variables).filter(([, v]) => typeof v === "string" && v.length > 0) as Array<
    [string, string]
  >;
  for (const [k, v] of entries) {
    result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
  }
  return result;
}

export function useRecruitmentMessageTemplates() {
  const { currentAccount } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["recruitment-message-templates", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];
      const { data, error } = await supabase
        .from("recruitment_message_templates")
        .select("*")
        .eq("account_id", currentAccount.id)
        .order("message_type")
        .order("channel")
        .order("reminder_day", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return (data || []) as RecruitmentMessageTemplate[];
    },
    enabled: !!currentAccount?.id,
  });

  const initializeDefaultsMutation = useMutation({
    mutationFn: async () => {
      if (!currentAccount?.id) throw new Error("No account selected");
      const { data: existing, error } = await supabase
        .from("recruitment_message_templates")
        .select("channel, message_type, reminder_day")
        .eq("account_id", currentAccount.id);
      if (error) throw error;
      const key = (t: { channel: string; message_type: string; reminder_day: number | null }) =>
        `${t.channel}::${t.message_type}::${t.reminder_day ?? "_"}`;
      const existingKeys = new Set((existing || []).map((r) => key(r as any)));
      const needed = DEFAULT_TEMPLATES.filter((t) => !existingKeys.has(key(t as any)));
      if (needed.length === 0) return [];
      const nowIso = new Date().toISOString();
      const { data: inserted, error: insertError } = await supabase
        .from("recruitment_message_templates")
        .insert(
          needed.map((t) => ({
            ...t,
            account_id: currentAccount.id,
            updated_at: nowIso,
          }))
        )
        .select();
      if (insertError) throw insertError;
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-message-templates"] });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (
      template: Omit<RecruitmentMessageTemplate, "id" | "account_id" | "created_at" | "updated_at">
    ) => {
      if (!currentAccount?.id) throw new Error("No account selected");
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("recruitment_message_templates")
        .insert({ ...template, account_id: currentAccount.id, updated_at: nowIso })
        .select()
        .single();
      if (error) throw error;
      return data as RecruitmentMessageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-message-templates"] });
      toast({ title: "Template criado", description: "O template foi salvo com sucesso." });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({
      templateId,
      updates,
    }: {
      templateId: string;
      updates: Partial<Omit<RecruitmentMessageTemplate, "id" | "account_id" | "created_at" | "updated_at">>;
    }) => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("recruitment_message_templates")
        .update({ ...updates, updated_at: nowIso })
        .eq("id", templateId)
        .select()
        .single();
      if (error) throw error;
      return data as RecruitmentMessageTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-message-templates"] });
      toast({ title: "Template atualizado", description: "O template foi atualizado com sucesso." });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from("recruitment_message_templates").delete().eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-message-templates"] });
      toast({ title: "Template removido", description: "O template foi removido com sucesso." });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    initializeDefaults: initializeDefaultsMutation.mutate,
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
  };
}
