import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";

export function useRecruitmentActions() {
  const queryClient = useQueryClient();
  const { currentAccount } = useOrganization();

  const normalizeStageId = (value: string) =>
    (value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-+/g, "_");

  const updateCandidateStage = useMutation({
    mutationFn: async ({ candidateId, stage }: { candidateId: string; stage: string }) => {
      const { error } = await supabase
        .from("recruitment_candidates")
        .update({ stage, updated_at: new Date().toISOString() })
        .eq("id", candidateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      toast.success("Etapa do candidato atualizada");
    },
    onError: (error) => {
      console.error("Error updating candidate stage:", error);
      toast.error("Erro ao atualizar etapa do candidato");
    },
  });

  const updateApplicationStatus = useMutation({
    mutationFn: async ({ 
      applicationId, 
      status,
      candidateId,
      jobId,
      previousStatus,
      notifyCandidate = true,
    }: { 
      applicationId: string; 
      status: string;
      candidateId?: string;
      jobId?: string;
      previousStatus?: string;
      notifyCandidate?: boolean;
    }) => {
      if (status === "hired") {
        const result = await invokeAuthenticatedFunction("handle-post-hire-automation", {
          applicationId,
          candidateId,
          jobId,
        });
        if (result.error) throw new Error(result.error);
        return result.data;
      }

      const { error } = await supabase
        .from("recruitment_applications")
        .update({
          status,
          updated_at: new Date().toISOString(),
          update_source: "recruiter_status_change",
        })
        .eq("id", applicationId);

      if (error) throw error;

       // Automação DISC: ao mover para o estágio DISC/Fit Comportamental, dispara convite (e-mail + WhatsApp)
       // Regras: usa vaga atual (jobId) e reutiliza sessão existente (a função já trata isso).
       const normalized = normalizeStageId(status);
       const isDiscStage = normalized === "disc" || normalized === "fit_comportamental";
       if (isDiscStage && candidateId && jobId && currentAccount?.id) {
         try {
           await supabase.functions.invoke("send-disc-invitation", {
             body: {
               candidateId,
               jobId,
               accountId: currentAccount.id,
             },
           });
         } catch (err) {
           // Best-effort: não bloqueia a mudança de etapa.
           console.error("DISC invitation automation failed:", err);
         }
       }

      // Log activity if we have candidate info
      if (candidateId && currentAccount?.id && previousStatus) {
        const { data: user } = await supabase.auth.getUser();
        await supabase
          .from("recruitment_activities")
          .insert([{
            account_id: currentAccount.id,
            candidate_id: candidateId,
            application_id: applicationId,
            job_id: jobId || null,
            activity_type: "status_change",
            description: `Status alterado de ${getStatusLabel(previousStatus)} para ${getStatusLabel(status)}`,
            metadata: { previous_status: previousStatus, new_status: status },
            performed_by: user.user?.id || null,
          }]);

        // Register tracking event for significant status changes
        const trackableStatuses = ['qualified', 'hired', 'rejected', 'offer', 'desqualificado'];
        if (trackableStatuses.includes(status)) {
          // Fetch candidate's first_touch data to inherit source
          const { data: candidateData } = await supabase
            .from("recruitment_candidates")
            .select("first_touch_source, first_touch_medium, first_touch_campaign")
            .eq("id", candidateId)
            .single();

          // Fetch application source as fallback
          const { data: appData } = await supabase
            .from("recruitment_applications")
            .select("source, medium, campaign")
            .eq("id", applicationId)
            .single();

          const eventSource = appData?.source || candidateData?.first_touch_source || null;
          const eventMedium = appData?.medium || candidateData?.first_touch_medium || null;
          const eventCampaign = appData?.campaign || candidateData?.first_touch_campaign || null;

          await supabase.from("candidate_tracking_events").insert([{
            account_id: currentAccount.id,
            candidate_id: candidateId,
            application_id: applicationId,
            job_id: jobId || null,
            event_type: status,
            source: eventSource,
            medium: eventMedium,
            campaign: eventCampaign,
            metadata: { 
              previous_status: previousStatus,
              triggered_by: "status_change",
            },
          }]);
        }
      }

      // Rejection notification (email + WhatsApp) for manual rejection/disqualification
      if (
        (status === "rejected" || status === "desqualificado") &&
        previousStatus !== status &&
        candidateId &&
        jobId
      ) {
        try {
          const { data: userResp } = await supabase.auth.getUser();
          await supabase.functions.invoke("send-rejection-notification", {
            body: {
              applicationId,
              reason: "manual",
              triggeredBy: userResp.user?.id || null,
              notify: notifyCandidate,
            },
          });
        } catch (err) {
          // Best-effort: não bloqueia a mudança de etapa.
          console.error("Rejection notification failed:", err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-activities"] });
      toast.success("Status da aplicação atualizado");
    },
    onError: (error) => {
      console.error("Error updating application status:", error);
      toast.error("Erro ao atualizar status da aplicação");
    },
  });

// Helper to get status labels in Portuguese
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    applied: "Aplicado",
    screening: "Triagem",
    interview: "Entrevista",
    evaluation: "Avaliação",
    offer: "Proposta",
    hired: "Contratado",
    rejected: "Rejeitado",
  };
  return labels[status] || status;
}

  const hireCandidate = useMutation({
    mutationFn: async ({ 
      candidateId, 
      applicationId,
      jobId,
      onboardingProcessId,
      hiredAt,
      salary,
      feeValue,
      feeDueDate,
      feeNotes,
    }: { 
      candidateId: string; 
      applicationId?: string;
      jobId?: string;
      onboardingProcessId?: string;
      hiredAt?: string;
      salary?: number;
      feeValue?: number;
      feeDueDate?: string | null;
      feeNotes?: string | null;
    }) => {
      if (applicationId) {
        const result = await invokeAuthenticatedFunction("handle-post-hire-automation", {
          applicationId,
          candidateId,
          jobId,
          onboardingProcessId,
          hiredAt,
          salary,
          feeValue,
          feeDueDate,
          feeNotes,
        });
        if (result.error) throw new Error(result.error);
        return result.data;
      }

      const { error: candidateError } = await supabase
        .from("recruitment_candidates")
        .update({ stage: "hired", updated_at: new Date().toISOString() })
        .eq("id", candidateId);
      if (candidateError) throw candidateError;
      return { candidateId, applicationId };
    },
    onSuccess: async (_data, variables) => {
      // Defense-in-depth: ensure application status really moved to 'hired'.
      // If the edge function silently failed to flip it, do a direct fallback update
      // so the Kanban / dashboards reflect the hire immediately.
      if (variables.applicationId) {
        try {
          const { data: app } = await supabase
            .from("recruitment_applications")
            .select("id, status")
            .eq("id", variables.applicationId)
            .maybeSingle();
          if (app && app.status !== "hired") {
            console.warn("[hireCandidate] Application status not synced to 'hired' — applying fallback update", app);
            await supabase
              .from("recruitment_applications")
              .update({
                status: "hired",
                updated_at: new Date().toISOString(),
                update_source: "hire_fallback_sync",
              })
              .eq("id", variables.applicationId);
          }
        } catch (e) {
          console.error("[hireCandidate] fallback sync failed:", e);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-events"] });
      queryClient.invalidateQueries({ queryKey: ["post-hire-checklists"] });
    },
    onError: (error) => {
      console.error("Error hiring candidate:", error);
      toast.error("Erro ao contratar candidato");
    },
  });

  const deleteApplication = useMutation({
    mutationFn: async ({ 
      sessionId,
      applicationId 
    }: { 
      sessionId: string;
      applicationId?: string;
    }) => {
      // First delete responses related to the session
      const { error: responsesError } = await supabase
        .from("culture_interview_responses")
        .delete()
        .eq("session_id", sessionId);

      if (responsesError) {
        console.error("Error deleting responses:", responsesError);
      }

      // Delete the culture interview session
      const { error: sessionError } = await supabase
        .from("culture_interview_sessions")
        .delete()
        .eq("id", sessionId);

      if (sessionError) throw sessionError;

      // Delete the application record if provided
      if (applicationId) {
        const { error: applicationError } = await supabase
          .from("recruitment_applications")
          .delete()
          .eq("id", applicationId);

        if (applicationError) throw applicationError;
      }

      return { sessionId, applicationId };
    },
    onSuccess: () => {
      // Invalidate all related queries - use refetchType: 'all' to ensure immediate refetch
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["recruitment-applications"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["culture-interview-sessions"], refetchType: "all" });
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "culture-interviews-job",
        refetchType: "all"
      });
      queryClient.invalidateQueries({ queryKey: ["job-applications"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["candidate-profile-modal"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["candidate-applications"], refetchType: "all" });
      toast.success("Candidatura excluída com sucesso");
    },
    onError: (error) => {
      console.error("Error deleting application:", error);
      toast.error("Erro ao excluir candidatura");
    },
  });

  // Duplicate a job
  const duplicateJob = useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      // First fetch the job to duplicate
      const { data: job, error: fetchError } = await supabase
        .from("recruitment_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (fetchError) throw fetchError;

      // Create a copy with modified title
      const { data: newJob, error: insertError } = await supabase
        .from("recruitment_jobs")
        .insert({
          account_id: job.account_id,
          title: `${job.title} (Cópia)`,
          description: job.description,
          department: job.department,
          location: job.location,
          employment_type: job.employment_type,
          budget_min: job.budget_min,
          budget_max: job.budget_max,
          status: "draft",
          work_regime: job.work_regime,
          work_modality: job.work_modality,
          hide_salary: job.hide_salary,
          additional_info: job.additional_info,
          agent_id: job.agent_id,
          job_description_id: job.job_description_id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return newJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      toast.success("Vaga duplicada com sucesso");
    },
    onError: (error) => {
      console.error("Error duplicating job:", error);
      toast.error("Erro ao duplicar vaga");
    },
  });

  // Delete a job
  const deleteJob = useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      const { error } = await supabase
        .from("recruitment_jobs")
        .delete()
        .eq("id", jobId);

      if (error) throw error;
      return { jobId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-jobs"] });
      toast.success("Vaga excluída com sucesso");
    },
    onError: (error) => {
      console.error("Error deleting job:", error);
      toast.error("Erro ao excluir vaga");
    },
  });

  // Create a candidate
  const createCandidate = useMutation({
    mutationFn: async (candidateData: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      linkedinUrl?: string;
      source?: string;
      medium?: string;
      campaign?: string;
    }) => {
      if (!currentAccount?.id) throw new Error("No account selected");

      const now = new Date().toISOString();
      const source = candidateData.source || "direct";
      const medium = candidateData.medium || "direct";
      
      const { data, error } = await supabase
        .from("recruitment_candidates")
        .insert({
          account_id: currentAccount.id,
          first_name: candidateData.firstName,
          last_name: candidateData.lastName,
          email: candidateData.email,
          phone: candidateData.phone,
          linkedin_url: candidateData.linkedinUrl,
          stage: "applied",
          source: source,
          // First touch tracking
          first_touch_source: source,
          first_touch_medium: medium,
          first_touch_campaign: candidateData.campaign || null,
          first_touch_at: now,
          last_touch_source: source,
          last_touch_medium: medium,
          last_touch_campaign: candidateData.campaign || null,
          last_touch_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      // Register tracking event
      await supabase.from("candidate_tracking_events").insert([{
        account_id: currentAccount.id,
        candidate_id: data.id,
        event_type: "submitted_application",
        source: source,
        medium: medium,
        campaign: candidateData.campaign || null,
        metadata: { created_manually: true },
      }]);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-events"] });
      toast.success("Candidato criado com sucesso");
    },
    onError: (error) => {
      console.error("Error creating candidate:", error);
      toast.error("Erro ao criar candidato");
    },
  });

  // Update a candidate
  const updateCandidate = useMutation({
    mutationFn: async ({ 
      candidateId, 
      data 
    }: { 
      candidateId: string; 
      data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        linkedinUrl?: string;
      };
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (data.firstName !== undefined) updateData.first_name = data.firstName;
      if (data.lastName !== undefined) updateData.last_name = data.lastName;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.linkedinUrl !== undefined) updateData.linkedin_url = data.linkedinUrl;

      const { error } = await supabase
        .from("recruitment_candidates")
        .update(updateData)
        .eq("id", candidateId);

      if (error) throw error;
      return { candidateId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      toast.success("Candidato atualizado com sucesso");
    },
    onError: (error) => {
      console.error("Error updating candidate:", error);
      toast.error("Erro ao atualizar candidato");
    },
  });

  // Delete a candidate
  const deleteCandidate = useMutation({
    mutationFn: async ({ candidateId }: { candidateId: string }) => {
      const { error } = await supabase
        .from("recruitment_candidates")
        .delete()
        .eq("id", candidateId);

      if (error) throw error;
      return { candidateId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-candidates"] });
      toast.success("Candidato excluído com sucesso");
    },
    onError: (error) => {
      console.error("Error deleting candidate:", error);
      toast.error("Erro ao excluir candidato");
    },
  });

  // Duplicate an agent
  const duplicateAgent = useMutation({
    mutationFn: async ({ agentId }: { agentId: string }) => {
      // Fetch the agent
      const { data: agent, error: fetchError } = await supabase
        .from("recruitment_agents")
        .select("*")
        .eq("id", agentId)
        .single();

      if (fetchError) throw fetchError;

      // Create a copy
      const { data: newAgent, error: insertError } = await supabase
        .from("recruitment_agents")
        .insert({
          account_id: agent.account_id,
          name: `${agent.name} (Cópia)`,
          description: agent.description,
          type: agent.type,
          language: agent.language,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Copy questions
      const { data: questions, error: questionsError } = await supabase
        .from("recruitment_agent_questions")
        .select("*")
        .eq("agent_id", agentId);

      if (!questionsError && questions && questions.length > 0) {
        const newQuestions = questions.map(q => ({
          agent_id: newAgent.id,
          question_text: q.question_text,
          position: q.position,
        }));

        await supabase.from("recruitment_agent_questions").insert(newQuestions);
      }

      // Copy criteria
      const { data: criteria, error: criteriaError } = await supabase
        .from("recruitment_agent_criteria")
        .select("*")
        .eq("agent_id", agentId);

      if (!criteriaError && criteria && criteria.length > 0) {
        const newCriteria = criteria.map(c => ({
          agent_id: newAgent.id,
          name: c.name,
          description: c.description,
          weight: c.weight,
        }));

        await supabase.from("recruitment_agent_criteria").insert(newCriteria);
      }

      return newAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-agents"] });
      toast.success("Agente duplicado com sucesso");
    },
    onError: (error) => {
      console.error("Error duplicating agent:", error);
      toast.error("Erro ao duplicar agente");
    },
  });

  // Delete an agent
  const deleteAgent = useMutation({
    mutationFn: async ({ agentId }: { agentId: string }) => {
      // Delete related questions
      await supabase
        .from("recruitment_agent_questions")
        .delete()
        .eq("agent_id", agentId);

      // Delete related criteria
      await supabase
        .from("recruitment_agent_criteria")
        .delete()
        .eq("agent_id", agentId);

      // Delete the agent
      const { error } = await supabase
        .from("recruitment_agents")
        .delete()
        .eq("id", agentId);

      if (error) throw error;
      return { agentId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-agents"] });
      toast.success("Agente excluído com sucesso");
    },
    onError: (error) => {
      console.error("Error deleting agent:", error);
      toast.error("Erro ao excluir agente");
    },
  });

  // Cancel an interview
  const cancelInterview = useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { error } = await supabase
        .from("culture_interview_sessions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", sessionId);

      if (error) throw error;
      return { sessionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-interviews"] });
      queryClient.invalidateQueries({ queryKey: ["culture-interview-sessions"] });
      toast.success("Entrevista cancelada");
    },
    onError: (error) => {
      console.error("Error cancelling interview:", error);
      toast.error("Erro ao cancelar entrevista");
    },
  });

  return {
    updateCandidateStage,
    updateApplicationStatus,
    hireCandidate,
    deleteApplication,
    duplicateJob,
    deleteJob,
    createCandidate,
    updateCandidate,
    deleteCandidate,
    duplicateAgent,
    deleteAgent,
    cancelInterview,
  };
}
