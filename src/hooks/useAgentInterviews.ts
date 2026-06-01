import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgentInterviewData {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateId: string;
  jobTitle: string;
  jobId: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  evaluationStatus: "approved" | "rejected" | "pending";
  overallScore: number;
  duration: number;
  completedAt: Date;
  startedAt: Date | null;
  agentName: string;
  agentId: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchAgentInterviews(agentId: string): Promise<AgentInterviewData[]> {
  // Query all sessions and filter manually to avoid type issues with new columns
  // Cast to any to bypass deep type instantiation issues
  const result = await (supabase as any)
    .from("culture_interview_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error("Error fetching agent interviews:", result.error);
    throw result.error;
  }

  const sessions = result.data as any[] | null;
  if (!sessions || sessions.length === 0) return [];

  // Filter by agent_id manually since the column may not be in types
  const sessionsFiltered = sessions.filter((s: any) => s.agent_id === agentId);

  if (sessionsFiltered.length === 0) return [];

  // Get related data - support both candidate_id (recruitment flow) and candidate_profile_id (internal flow)
  const candidateIds = [...new Set(sessionsFiltered.map((s: any) => s.candidate_id).filter(Boolean))] as string[];
  const candidateProfileIds = [...new Set(sessionsFiltered.map((s: any) => s.candidate_profile_id).filter(Boolean))] as string[];
  const jobIds = [...new Set(sessionsFiltered.map((s: any) => s.job_id).filter(Boolean))] as string[];

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
  
  const jobsRes = jobIds.length > 0
    ? await supabase.from("recruitment_jobs").select("id, title").in("id", jobIds)
    : { data: [] };
  
  const agentRes = await supabase.from("recruitment_agents").select("id, name").eq("id", agentId).single();

  const candidatesMap = new Map((candidatesRes.data || []).map((c: any) => [c.id, c]));
  const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
  const profileEmailsMap = new Map((profileEmailsRes.data || []).map((p: any) => [p.id, p.email]));
  const jobsMap = new Map((jobsRes.data || []).map((j: any) => [j.id, j]));
  const agent = agentRes.data;

  return sessionsFiltered.map((session: any) => {
    // Try recruitment candidate first (external flow), then candidate profile (internal flow)
    const recruitmentCandidate = session.candidate_id ? candidatesMap.get(session.candidate_id) : undefined;
    const candidateProfile = session.candidate_profile_id ? profilesMap.get(session.candidate_profile_id) : undefined;
    const job = jobsMap.get(session.job_id);
    
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
      jobTitle: job?.title || "Vaga",
      jobId: session.job_id || "",
      status: session.status as AgentInterviewData["status"],
      evaluationStatus,
      overallScore: session.matching_score || 0,
      duration: session.duration_seconds || 0,
      completedAt: session.completed_at ? new Date(session.completed_at) : new Date(),
      startedAt: session.started_at ? new Date(session.started_at) : null,
      agentName: agent?.name || "Agente",
      agentId: session.agent_id || agentId,
    };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function useAgentInterviews(agentId: string | undefined) {
  return useQuery({
    queryKey: ["agent-interviews", agentId],
    queryFn: () => fetchAgentInterviews(agentId!),
    enabled: !!agentId,
  });
}
