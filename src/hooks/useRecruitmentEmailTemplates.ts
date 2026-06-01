import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";

export interface EmailTemplate {
  id: string;
  account_id: string;
  name: string;
  subject: string;
  body: string;
  type: EmailTemplateType;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type EmailTemplateType = "rejection" | "interview_invite" | "offer" | "workflow_advance" | "workflow_complete" | "custom";

export const DEFAULT_TEMPLATES: Omit<EmailTemplate, "id" | "account_id" | "created_at" | "updated_at">[] = [
  {
    name: "Rejeição Padrão",
    subject: "Atualização sobre sua candidatura - {{job_title}}",
    body: `Olá {{candidate_name}},

Agradecemos pelo seu interesse na vaga de {{job_title}} na {{company_name}}.

Após análise cuidadosa, decidimos seguir com outros candidatos neste momento. Esta decisão não diminui suas qualificações e encorajamos você a se candidatar a futuras oportunidades em nossa empresa.

Desejamos sucesso em sua busca profissional.

Atenciosamente,
Equipe {{company_name}}`,
    type: "rejection",
    is_default: true,
  },
  {
    name: "Convite para Entrevista",
    subject: "Convite para Entrevista - {{job_title}}",
    body: `Olá {{candidate_name}},

Ficamos muito felizes com sua candidatura para a vaga de {{job_title}} na {{company_name}}!

Gostaríamos de convidá-lo(a) para uma entrevista para conhecê-lo(a) melhor. Por favor, entre em contato conosco para agendarmos um horário conveniente.

Aguardamos seu retorno.

Atenciosamente,
Equipe {{company_name}}`,
    type: "interview_invite",
    is_default: true,
  },
  {
    name: "Proposta de Trabalho",
    subject: "Proposta de Trabalho - {{job_title}}",
    body: `Olá {{candidate_name}},

Temos o prazer de informar que você foi selecionado(a) para a vaga de {{job_title}} na {{company_name}}!

Gostaríamos de apresentar nossa proposta de trabalho. Por favor, entre em contato conosco para discutirmos os detalhes.

Estamos muito animados com a possibilidade de tê-lo(a) em nossa equipe!

Atenciosamente,
Equipe {{company_name}}`,
    type: "offer",
    is_default: true,
  },
];

export function useRecruitmentEmailTemplates() {
  const { currentAccount } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["recruitment-email-templates", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];

      const { data, error } = await supabase
        .from("recruitment_email_templates")
        .select("*")
        .eq("account_id", currentAccount.id)
        .order("type")
        .order("name");

      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: !!currentAccount?.id,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<EmailTemplate, "id" | "account_id" | "created_at" | "updated_at">) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data, error } = await supabase
        .from("recruitment_email_templates")
        .insert({
          ...template,
          account_id: currentAccount.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-email-templates"] });
      toast({
        title: "Template criado",
        description: "O template foi salvo com sucesso.",
      });
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
      updates: Partial<Omit<EmailTemplate, "id" | "account_id" | "created_at" | "updated_at">>;
    }) => {
      const { data, error } = await supabase
        .from("recruitment_email_templates")
        .update(updates)
        .eq("id", templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-email-templates"] });
      toast({
        title: "Template atualizado",
        description: "O template foi atualizado com sucesso.",
      });
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
      const { error } = await supabase
        .from("recruitment_email_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-email-templates"] });
      toast({
        title: "Template removido",
        description: "O template foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const initializeDefaultTemplatesMutation = useMutation({
    mutationFn: async () => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data: existing } = await supabase
        .from("recruitment_email_templates")
        .select("type")
        .eq("account_id", currentAccount.id)
        .eq("is_default", true);

      const existingTypes = new Set(existing?.map((t) => t.type) ?? []);
      const templatesNeeded = DEFAULT_TEMPLATES.filter((t) => !existingTypes.has(t.type));

      if (templatesNeeded.length === 0) return [];

      const { data, error } = await supabase
        .from("recruitment_email_templates")
        .insert(
          templatesNeeded.map((t) => ({
            ...t,
            account_id: currentAccount.id,
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-email-templates"] });
    },
  });

  const getTemplatesByType = (type: EmailTemplateType) => {
    return templatesQuery.data?.filter((t) => t.type === type) ?? [];
  };

  const getDefaultTemplate = (type: EmailTemplateType) => {
    return templatesQuery.data?.find((t) => t.type === type && t.is_default);
  };

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    initializeDefaultTemplates: initializeDefaultTemplatesMutation.mutate,
    getTemplatesByType,
    getDefaultTemplate,
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
  };
}

export function replaceTemplateVariables(
  template: string,
  variables: {
    candidate_name?: string;
    job_title?: string;
    company_name?: string;
    custom_message?: string;
  }
): string {
  let result = template;
  if (variables.candidate_name) {
    result = result.replace(/\{\{candidate_name\}\}/g, variables.candidate_name);
  }
  if (variables.job_title) {
    result = result.replace(/\{\{job_title\}\}/g, variables.job_title);
  }
  if (variables.company_name) {
    result = result.replace(/\{\{company_name\}\}/g, variables.company_name);
  }
  if (variables.custom_message) {
    result = result.replace(/\{\{custom_message\}\}/g, variables.custom_message);
  }
  return result;
}
