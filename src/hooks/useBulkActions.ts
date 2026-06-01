import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import type { ReminderData } from "@/components/recruitment/bulk/BulkReminderDialog";

export function useBulkActions() {
  const { currentAccount } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const moveToStageMutation = useMutation({
    mutationFn: async ({
      applicationIds,
      newStatus,
    }: {
      applicationIds: string[];
      newStatus: string;
    }) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Update all applications
      const { error: updateError } = await supabase
        .from("recruitment_applications")
        .update({ status: newStatus, update_source: "bulk_status_change" })
        .in("id", applicationIds);

      if (updateError) throw updateError;

      // Get application details for activity logging
      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select("id, candidate_id")
        .in("id", applicationIds);

      // Register activities
      if (applications) {
        const activities = applications.map((app) => ({
          account_id: currentAccount.id,
          candidate_id: app.candidate_id,
          application_id: app.id,
          activity_type: "status_change" as const,
          description: `Status alterado em massa para ${newStatus}`,
          created_by: userData.user!.id,
          metadata: { new_status: newStatus, bulk_action: true },
        }));

        await supabase.from("recruitment_activities").insert(activities);
      }

      return { count: applicationIds.length, status: newStatus };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-activities"] });
      toast({
        title: "Aplicações atualizadas",
        description: `${data.count} aplicação(ões) movida(s) para ${data.status}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar aplicações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectApplicationsMutation = useMutation({
    mutationFn: async ({
      applicationIds,
      sendEmail = false,
      templateId,
    }: {
      applicationIds: string[];
      sendEmail?: boolean;
      templateId?: string;
    }) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Update all applications to rejected
      const { error: updateError } = await supabase
        .from("recruitment_applications")
        .update({ status: "rejected", update_source: "bulk_reject" })
        .in("id", applicationIds);

      if (updateError) throw updateError;

      // Get application details for activity logging
      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select(`
          id, 
          candidate_id,
          candidate:recruitment_candidates(id, email, first_name, last_name),
          job:recruitment_jobs(id, title)
        `)
        .in("id", applicationIds);

      // Register activities
      if (applications) {
        const activities = applications.map((app) => ({
          account_id: currentAccount.id,
          candidate_id: app.candidate_id,
          application_id: app.id,
          activity_type: "rejected" as const,
          description: "Candidatura rejeitada em massa",
          created_by: userData.user!.id,
          metadata: { bulk_action: true, email_sent: sendEmail },
        }));

        await supabase.from("recruitment_activities").insert(activities);
      }

      // Send rejection emails if requested
      if (sendEmail && templateId && applications) {
        const candidatesWithEmail = applications.filter(
          (app: any) => app.candidate?.email
        );

        if (candidatesWithEmail.length > 0) {
          // Call edge function to send emails
          const { error: emailError } = await supabase.functions.invoke(
            "send-rejection-email",
            {
              body: {
                applications: candidatesWithEmail.map((app: any) => ({
                  applicationId: app.id,
                  candidateEmail: app.candidate.email,
                  candidateName: `${app.candidate.first_name || ""} ${app.candidate.last_name || ""}`.trim(),
                  jobTitle: app.job?.title || "Vaga",
                })),
                templateId,
                accountId: currentAccount.id,
              },
            }
          );

          if (emailError) {
            console.error("Error sending rejection emails:", emailError);
          }
        }
      }

      return { count: applicationIds.length, emailsSent: sendEmail };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-activities"] });
      toast({
        title: "Candidaturas rejeitadas",
        description: `${data.count} candidatura(s) rejeitada(s).${data.emailsSent ? " Emails de rejeição enviados." : ""}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao rejeitar candidaturas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendBulkEmailMutation = useMutation({
    mutationFn: async ({
      candidateIds,
      templateId,
      customMessage,
    }: {
      candidateIds: string[];
      templateId: string;
      customMessage?: string;
    }) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Get candidate details
      const { data: candidates, error: fetchError } = await supabase
        .from("recruitment_candidates")
        .select("id, email, first_name, last_name")
        .in("id", candidateIds)
        .not("email", "is", null);

      if (fetchError) throw fetchError;

      if (!candidates || candidates.length === 0) {
        throw new Error("Nenhum candidato com email válido encontrado");
      }

      // Get template
      const { data: template, error: templateError } = await supabase
        .from("recruitment_email_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Call edge function to send emails
      const { error: emailError } = await supabase.functions.invoke(
        "send-rejection-email",
        {
          body: {
            candidates: candidates.map((c) => ({
              candidateId: c.id,
              candidateEmail: c.email,
              candidateName: `${c.first_name || ""} ${c.last_name || ""}`.trim(),
            })),
            templateId,
            customMessage,
            accountId: currentAccount.id,
          },
        }
      );

      if (emailError) throw emailError;

      // Register activities
      const activities = candidates.map((c) => ({
        account_id: currentAccount.id,
        candidate_id: c.id,
        activity_type: "email_sent" as const,
        description: `Email enviado: ${template.name}`,
        created_by: userData.user!.id,
        metadata: { template_id: templateId, bulk_action: true },
      }));

      await supabase.from("recruitment_activities").insert(activities);

      return { count: candidates.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-activities"] });
      toast({
        title: "Emails enviados",
        description: `${data.count} email(s) enviado(s) com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar emails",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ============ NEW BULK ACTIONS ============

  const addTagsMutation = useMutation({
    mutationFn: async ({
      applicationIds,
      tags,
    }: {
      applicationIds: string[];
      tags: string[];
    }) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Get current applications with their tags
      const { data: applications, error: fetchError } = await supabase
        .from("recruitment_applications")
        .select("id, candidate_id, tags")
        .in("id", applicationIds);

      if (fetchError) throw fetchError;

      // Update each application by merging tags
      const updates = (applications || []).map(async (app) => {
        const currentTags = (app.tags as string[]) || [];
        const newTags = [...new Set([...currentTags, ...tags])];

        return supabase
          .from("recruitment_applications")
          .update({ tags: newTags })
          .eq("id", app.id);
      });

      await Promise.all(updates);

      // Register activities
      const activities = (applications || []).map((app) => ({
        account_id: currentAccount.id,
        candidate_id: app.candidate_id,
        application_id: app.id,
        activity_type: "tag_added" as const,
        description: `Tags adicionadas: ${tags.join(", ")}`,
        created_by: userData.user!.id,
        metadata: { tags, bulk_action: true },
      }));

      await supabase.from("recruitment_activities").insert(activities);

      return { count: applicationIds.length, tags };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-activities"] });
      toast({
        title: "Tags adicionadas",
        description: `${data.tags.length} tag(s) adicionada(s) a ${data.count} candidato(s).`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar tags",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeTagsMutation = useMutation({
    mutationFn: async ({
      applicationIds,
      tags,
    }: {
      applicationIds: string[];
      tags: string[];
    }) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Get current applications with their tags
      const { data: applications, error: fetchError } = await supabase
        .from("recruitment_applications")
        .select("id, candidate_id, tags")
        .in("id", applicationIds);

      if (fetchError) throw fetchError;

      // Update each application by removing tags
      const updates = (applications || []).map(async (app) => {
        const currentTags = (app.tags as string[]) || [];
        const newTags = currentTags.filter((t) => !tags.includes(t));

        return supabase
          .from("recruitment_applications")
          .update({ tags: newTags })
          .eq("id", app.id);
      });

      await Promise.all(updates);

      // Register activities
      const activities = (applications || []).map((app) => ({
        account_id: currentAccount.id,
        candidate_id: app.candidate_id,
        application_id: app.id,
        activity_type: "tag_removed" as const,
        description: `Tags removidas: ${tags.join(", ")}`,
        created_by: userData.user!.id,
        metadata: { tags, bulk_action: true },
      }));

      await supabase.from("recruitment_activities").insert(activities);

      return { count: applicationIds.length, tags };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-activities"] });
      toast({
        title: "Tags removidas",
        description: `${data.tags.length} tag(s) removida(s) de ${data.count} candidato(s).`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover tags",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignEvaluatorMutation = useMutation({
    mutationFn: async ({
      applicationIds,
      evaluatorId,
    }: {
      applicationIds: string[];
      evaluatorId: string;
    }) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Update all applications with the evaluator
      const { error: updateError } = await supabase
        .from("recruitment_applications")
        .update({ assigned_to: evaluatorId })
        .in("id", applicationIds);

      if (updateError) throw updateError;

      // Get evaluator name from user metadata or profiles
      let evaluatorName = "Usuário";
      try {
        const { data: evaluatorProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", evaluatorId)
          .single();
        
        if (evaluatorProfile && 'full_name' in evaluatorProfile) {
          evaluatorName = (evaluatorProfile as any).full_name || "Usuário";
        }
      } catch {
        // Ignore profile fetch errors
      }

      // Get application details for activity logging
      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select("id, candidate_id")
        .in("id", applicationIds);

      // Register activities
      if (applications) {
        const activities = applications.map((app) => ({
          account_id: currentAccount.id,
          candidate_id: app.candidate_id,
          application_id: app.id,
          activity_type: "evaluator_assigned" as const,
          description: `Avaliador atribuído: ${evaluatorName}`,
          created_by: userData.user!.id,
          metadata: { evaluator_id: evaluatorId, bulk_action: true },
        }));

        await supabase.from("recruitment_activities").insert(activities);
      }

      return { count: applicationIds.length, evaluatorName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-activities"] });
      toast({
        title: "Avaliador atribuído",
        description: `${data.evaluatorName || "Avaliador"} atribuído a ${data.count} candidato(s).`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atribuir avaliador",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createRemindersMutation = useMutation({
    mutationFn: async ({
      applicationIds,
      reminder,
    }: {
      applicationIds: string[];
      reminder: ReminderData;
    }) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Get application details
      const { data: applications, error: fetchError } = await supabase
        .from("recruitment_applications")
        .select("id, candidate_id")
        .in("id", applicationIds);

      if (fetchError) throw fetchError;

      // Create reminders as activities with scheduled type
      const reminders = (applications || []).map((app) => ({
        account_id: currentAccount.id,
        candidate_id: app.candidate_id,
        application_id: app.id,
        activity_type: "reminder_scheduled" as const,
        description: reminder.message,
        created_by: userData.user!.id,
        metadata: {
          due_date: reminder.dueDate.toISOString(),
          priority: reminder.priority,
          bulk_action: true,
          status: "pending",
        },
      }));

      const { error: insertError } = await supabase
        .from("recruitment_activities")
        .insert(reminders);

      if (insertError) throw insertError;

      return { count: applicationIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-activities"] });
      toast({
        title: "Lembretes criados",
        description: `${data.count} lembrete(s) agendado(s) com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar lembretes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const archiveApplicationsMutation = useMutation({
    mutationFn: async ({
      applicationIds,
    }: {
      applicationIds: string[];
    }) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Update all applications to archived
      const { error: updateError } = await supabase
        .from("recruitment_applications")
        .update({ status: "archived", update_source: "bulk_archive" })
        .in("id", applicationIds);

      if (updateError) throw updateError;

      // Get application details for activity logging
      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select("id, candidate_id")
        .in("id", applicationIds);

      // Register activities
      if (applications) {
        const activities = applications.map((app) => ({
          account_id: currentAccount.id,
          candidate_id: app.candidate_id,
          application_id: app.id,
          activity_type: "archived" as const,
          description: "Candidatura arquivada em massa",
          created_by: userData.user!.id,
          metadata: { bulk_action: true },
        }));

        await supabase.from("recruitment_activities").insert(activities);
      }

      return { count: applicationIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-activities"] });
      toast({
        title: "Candidaturas arquivadas",
        description: `${data.count} candidatura(s) arquivada(s).`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao arquivar candidaturas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    // Existing actions
    moveToStage: moveToStageMutation.mutate,
    rejectApplications: rejectApplicationsMutation.mutate,
    sendBulkEmail: sendBulkEmailMutation.mutate,
    isMoving: moveToStageMutation.isPending,
    isRejecting: rejectApplicationsMutation.isPending,
    isSendingEmail: sendBulkEmailMutation.isPending,

    // New actions
    addTags: addTagsMutation.mutate,
    removeTags: removeTagsMutation.mutate,
    assignEvaluator: assignEvaluatorMutation.mutate,
    createReminders: createRemindersMutation.mutate,
    archiveApplications: archiveApplicationsMutation.mutate,
    isAddingTags: addTagsMutation.isPending,
    isRemovingTags: removeTagsMutation.isPending,
    isAssigning: assignEvaluatorMutation.isPending,
    isCreatingReminders: createRemindersMutation.isPending,
    isArchiving: archiveApplicationsMutation.isPending,

    // Combined loading state
    isLoading:
      moveToStageMutation.isPending ||
      rejectApplicationsMutation.isPending ||
      sendBulkEmailMutation.isPending ||
      addTagsMutation.isPending ||
      removeTagsMutation.isPending ||
      assignEvaluatorMutation.isPending ||
      createRemindersMutation.isPending ||
      archiveApplicationsMutation.isPending,
  };
}
