import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const usePortalJobs = (clienteId: string | undefined, accountId: string | undefined) => {
  return useQuery({
    queryKey: ["portal-jobs", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from("recruitment_jobs")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clienteId,
  });
};

export const usePortalCandidates = (clienteId: string | undefined) => {
  return useQuery({
    queryKey: ["portal-candidates", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      
      // Get all jobs for this client
      const { data: jobs } = await supabase
        .from("recruitment_jobs")
        .select("id, title")
        .eq("cliente_id", clienteId);
      
      if (!jobs || jobs.length === 0) return [];
      
      const jobIds = jobs.map(j => j.id);
      
      // Get applications for those jobs with candidate data
      const { data: applications, error } = await supabase
        .from("recruitment_applications")
        .select(`
          id, status, applied_at, 
          job_id,
          recruitment_candidates (
            id, name, email, phone, city, current_company, current_position,
            avatar_url, qualification_score, qualification_tags
          )
        `)
        .in("job_id", jobIds)
        .in("status", ["shortlisted", "hired", "rejected", "interview", "offer"]);
      
      if (error) throw error;
      
      // Enrich with job title
      return (applications || []).map((app: any) => ({
        ...app,
        jobTitle: jobs.find(j => j.id === app.job_id)?.title || "—",
      }));
    },
    enabled: !!clienteId,
  });
};

export const usePortalShortlist = (jobId: string | undefined) => {
  return useQuery({
    queryKey: ["portal-shortlist", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      
      const { data, error } = await supabase
        .from("recruitment_applications")
        .select(`
          id, status, created_at, job_id,
          recruitment_candidates (
            id, name, email, phone, city, current_company, current_position,
            avatar_url, linkedin_url, qualification_score, qualification_tags,
            qualification_summary, strengths, concerns
          )
        `)
        .eq("job_id", jobId)
        .eq("status", "shortlisted");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
  });
};

export const usePortalFeedbacks = (clienteId: string | undefined) => {
  return useQuery({
    queryKey: ["portal-feedbacks", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from("portal_feedbacks")
        .select("*")
        .eq("cliente_id", clienteId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clienteId,
  });
};

export const useSubmitFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedback: {
      account_id: string;
      vaga_id: string;
      candidato_id: string;
      cliente_id: string;
      contato_id?: string;
      decisao: string;
      motivo?: string;
      nota?: number;
    }) => {
      const { data, error } = await supabase
        .from("portal_feedbacks")
        .insert(feedback)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["portal-feedbacks", variables.cliente_id] });
      queryClient.invalidateQueries({ queryKey: ["portal-shortlist"] });
      toast.success("Feedback enviado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao enviar feedback");
    },
  });
};
