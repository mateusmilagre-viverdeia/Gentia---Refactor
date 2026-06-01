import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ActivityType = 
  | "application_created"
  | "status_change"
  | "interview_scheduled"
  | "interview_started"
  | "interview_completed"
  | "email_sent"
  | "note_added"
  | "hired"
  | "rejected"
  | "disc_completed";

export interface RecruitmentActivity {
  id: string;
  account_id: string;
  candidate_id: string;
  application_id?: string | null;
  job_id?: string | null;
  activity_type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  performed_by?: string | null;
  created_at: string;
  // Virtual fields for display
  performer_name?: string;
  job_title?: string;
}

interface LogActivityParams {
  accountId: string;
  candidateId: string;
  applicationId?: string | null;
  jobId?: string | null;
  activityType: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
}

export function useRecruitmentActivities(candidateId: string | null, enabled = true) {
  const queryClient = useQueryClient();

  // Fetch activities from the database
  const { data: dbActivities = [], isLoading: isLoadingDb } = useQuery({
    queryKey: ["recruitment-activities", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];

      const { data, error } = await supabase
        .from("recruitment_activities")
        .select(`
          id,
          account_id,
          candidate_id,
          application_id,
          job_id,
          activity_type,
          description,
          metadata,
          performed_by,
          created_at
        `)
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching recruitment activities:", error);
        return [];
      }

      return data as RecruitmentActivity[];
    },
    enabled: !!candidateId && enabled,
  });

  // Fetch virtual activities from existing data (applications, interviews, etc.)
  const { data: virtualActivities = [], isLoading: isLoadingVirtual } = useQuery({
    queryKey: ["recruitment-virtual-activities", candidateId],
    queryFn: async () => {
      if (!candidateId) return [];

      const activities: RecruitmentActivity[] = [];

      // Fetch applications
      const { data: applications } = await supabase
        .from("recruitment_applications")
        .select(`
          id,
          status,
          applied_at,
          job_id,
          candidate_id,
          recruitment_jobs(title, account_id)
        `)
        .eq("candidate_id", candidateId);

      if (applications) {
        for (const app of applications) {
          const job = app.recruitment_jobs as { title: string; account_id: string } | null;
          
          // Application created activity
          activities.push({
            id: `app-created-${app.id}`,
            account_id: job?.account_id || "",
            candidate_id: app.candidate_id,
            application_id: app.id,
            job_id: app.job_id,
            activity_type: "application_created",
            description: `Candidatura enviada para ${job?.title || "vaga"}`,
            created_at: app.applied_at,
            job_title: job?.title,
          });

          // Status changes (hired/rejected)
          if (app.status === "hired") {
            activities.push({
              id: `app-hired-${app.id}`,
              account_id: job?.account_id || "",
              candidate_id: app.candidate_id,
              application_id: app.id,
              job_id: app.job_id,
              activity_type: "hired",
              description: `Candidato contratado para ${job?.title || "vaga"}`,
              created_at: app.applied_at, // Ideally use updated_at
              job_title: job?.title,
            });
          }

          if (app.status === "rejected") {
            activities.push({
              id: `app-rejected-${app.id}`,
              account_id: job?.account_id || "",
              candidate_id: app.candidate_id,
              application_id: app.id,
              job_id: app.job_id,
              activity_type: "rejected",
              description: `Candidatura rejeitada para ${job?.title || "vaga"}`,
              created_at: app.applied_at,
              job_title: job?.title,
            });
          }
        }
      }

      // Fetch culture interview sessions
      const { data: interviews } = await supabase
        .from("culture_interview_sessions")
        .select(`
          id,
          status,
          matching_score,
          created_at,
          started_at,
          completed_at,
          job_id,
          candidate_profile_id,
          recruitment_jobs(title, account_id)
        `)
        .eq("candidate_profile_id", candidateId);

      if (interviews) {
        for (const interview of interviews) {
          // Handle the join result which can be an object or array
          const jobData = interview.recruitment_jobs;
          const job = Array.isArray(jobData) ? jobData[0] : jobData;

          // Interview scheduled
          activities.push({
            id: `interview-scheduled-${interview.id}`,
            account_id: job?.account_id || "",
            candidate_id: interview.candidate_profile_id,
            job_id: interview.job_id,
            activity_type: "interview_scheduled",
            description: `Entrevista cultural agendada para ${job?.title || "vaga"}`,
            created_at: interview.created_at,
            job_title: job?.title,
          });

          // Interview started
          if (interview.started_at) {
            activities.push({
              id: `interview-started-${interview.id}`,
              account_id: job?.account_id || "",
              candidate_id: interview.candidate_profile_id,
              job_id: interview.job_id,
              activity_type: "interview_started",
              description: `Entrevista iniciada para ${job?.title || "vaga"}`,
              created_at: interview.started_at,
              job_title: job?.title,
            });
          }

          // Interview completed
          if (interview.completed_at) {
            activities.push({
              id: `interview-completed-${interview.id}`,
              account_id: job?.account_id || "",
              candidate_id: interview.candidate_profile_id,
              job_id: interview.job_id,
              activity_type: "interview_completed",
              description: `Entrevista concluída${interview.matching_score ? ` - Score: ${interview.matching_score}%` : ""}`,
              metadata: { matching_score: interview.matching_score },
              created_at: interview.completed_at,
              job_title: job?.title,
            });
          }
        }
      }

      // Fetch DISC sessions
      const { data: discSessions } = await supabase
        .from("candidate_disc_sessions")
        .select(`
          id,
          status,
          completed_at,
          job_id,
          candidate_id,
          recruitment_jobs(title, account_id)
        `)
        .eq("candidate_id", candidateId)
        .eq("status", "completed");

      if (discSessions) {
        type DiscSession = typeof discSessions[number];
        type DiscJob = { title: string; account_id: string } | null;
        for (const disc of discSessions) {
          const job = disc.recruitment_jobs as DiscJob;

          if (disc.completed_at) {
            activities.push({
              id: `disc-completed-${disc.id}`,
              account_id: job?.account_id || "",
              candidate_id: disc.candidate_id,
              job_id: disc.job_id,
              activity_type: "disc_completed",
              description: `Avaliação DISC concluída para ${job?.title || "vaga"}`,
              created_at: disc.completed_at,
              job_title: job?.title,
            });
          }
        }
      }

      return activities;
    },
    enabled: !!candidateId && enabled,
  });

  // Combine and sort all activities
  const allActivities = [...dbActivities, ...virtualActivities]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    // Remove duplicates by id
    .filter((activity, index, self) => 
      index === self.findIndex(a => a.id === activity.id)
    );

  // Log activity mutation
  const logActivity = useMutation({
    mutationFn: async (params: LogActivityParams) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("recruitment_activities")
        .insert([{
          account_id: params.accountId,
          candidate_id: params.candidateId,
          application_id: params.applicationId || null,
          job_id: params.jobId || null,
          activity_type: params.activityType,
          description: params.description,
          metadata: (params.metadata || {}) as Json,
          performed_by: user.user?.id || null,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-activities"] });
    },
    onError: (error) => {
      console.error("Error logging activity:", error);
    },
  });

  return {
    activities: allActivities,
    isLoading: isLoadingDb || isLoadingVirtual,
    logActivity,
  };
}
