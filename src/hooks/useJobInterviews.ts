import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JobInterviewData {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateId: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  evaluationStatus: "approved" | "rejected" | "pending";
  overallScore: number;
  duration: number;
  completedAt: Date;
  startedAt: Date | null;
  agentName: string;
  agentId: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchJobInterviews(jobId: string): Promise<JobInterviewData[]> {
  // First get sessions for this job (only non-archived)
  const { data: sessions, error } = await supabase
    .from("culture_interview_sessions")
    .select("*")
    .eq("job_id", jobId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching job interviews:", error);
    throw error;
  }

  if (!sessions || sessions.length === 0) return [];

  const sessionsTyped = sessions as any[];

  // Get related data - support both candidate_id (recruitment flow) and candidate_profile_id (internal flow)
  const candidateIds = [...new Set(sessionsTyped.map((s: any) => s.candidate_id).filter(Boolean))] as string[];
  const candidateProfileIds = [...new Set(sessionsTyped.map((s: any) => s.candidate_profile_id).filter(Boolean))] as string[];
  const agentIds = [...new Set(sessionsTyped.map((s: any) => s.agent_id).filter(Boolean))] as string[];

  // Fetch recruitment candidates (external flow)
  const candidatesRes = candidateIds.length > 0 
    ? await supabase.from("recruitment_candidates").select("id, first_name, last_name, email").in("id", candidateIds)
    : { data: [] };
  
  // Fetch candidate profiles (internal flow - logged-in users)
  const profilesRes = candidateProfileIds.length > 0
    ? await supabase.from("candidate_profiles").select("id, full_name, first_name, last_name, user_id").in("id", candidateProfileIds)
    : { data: [] };

  // Get emails for profiles from auth profiles table
  const profileUserIds = (profilesRes.data || []).map((p: any) => p.user_id).filter(Boolean);
  const profileEmailsRes = profileUserIds.length > 0
    ? await supabase.from("profiles").select("id, email").in("id", profileUserIds)
    : { data: [] };
  
  const agentsRes = agentIds.length > 0
    ? await supabase.from("recruitment_agents").select("id, name").in("id", agentIds)
    : { data: [] };

  const candidatesMap = new Map((candidatesRes.data || []).map((c: any) => [c.id, c]));
  const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
  const profileEmailsMap = new Map((profileEmailsRes.data || []).map((p: any) => [p.id, p.email]));
  const agentsMap = new Map((agentsRes.data || []).map((a: any) => [a.id, a]));

  return sessionsTyped.map((session: any) => {
    // Try recruitment candidate first (external flow), then candidate profile (internal flow)
    const recruitmentCandidate = session.candidate_id ? candidatesMap.get(session.candidate_id) : undefined;
    const candidateProfile = session.candidate_profile_id ? profilesMap.get(session.candidate_profile_id) : undefined;
    const agent = session.agent_id ? agentsMap.get(session.agent_id) : undefined;
    
    // Build candidate name from whichever source is available
    let candidateName = "Candidato";
    let candidateEmail = "";
    let candidateId = "";
    
    if (recruitmentCandidate) {
      candidateName = `${recruitmentCandidate.first_name || ""} ${recruitmentCandidate.last_name || ""}`.trim() || "Candidato";
      candidateEmail = recruitmentCandidate.email || "";
      candidateId = session.candidate_id;
    } else if (candidateProfile) {
      candidateName = candidateProfile.full_name || 
        `${candidateProfile.first_name || ""} ${candidateProfile.last_name || ""}`.trim() || "Candidato";
      candidateEmail = candidateProfile.user_id ? (profileEmailsMap.get(candidateProfile.user_id) || "") : "";
      candidateId = session.candidate_profile_id;
    }
    
    let evaluationStatus: "approved" | "rejected" | "pending" = "pending";
    if (session.status === "completed" && session.matching_score !== null) {
      evaluationStatus = session.matching_score >= 7 ? "approved" : "rejected";
    }

    return {
      id: session.id,
      candidateName,
      candidateEmail,
      candidateId,
      status: session.status as JobInterviewData["status"],
      evaluationStatus,
      overallScore: session.matching_score || 0,
      duration: session.duration_seconds || 0,
      completedAt: session.completed_at ? new Date(session.completed_at) : new Date(),
      startedAt: session.started_at ? new Date(session.started_at) : null,
      agentName: agent?.name || "Agente",
      agentId: session.agent_id || null,
    };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function useJobInterviews(jobId: string | undefined) {
  return useQuery({
    queryKey: ["job-interviews", jobId],
    queryFn: () => fetchJobInterviews(jobId!),
    enabled: !!jobId,
  });
}
