import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UnifiedSessionType = "cultural" | "disc" | "technical";

export interface UnifiedSession {
  id: string;
  type: UnifiedSessionType;
  candidateId: string;
  candidateProfileId: string | null;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  jobId: string;
  jobTitle: string;
  agentId: string | null;
  agentName: string;
  applicationId: string | null;
  status: string;
  score: number | null;
  durationSeconds: number | null;
  createdAt: Date;
  completedAt: Date | null;
  startedAt: Date | null;
  emailSentAt: string | null;
  reusedFromSessionId: string | null;
  isArchived?: boolean;
  attemptNumber?: number | null;
}

export interface SessionFilters {
  accountId: string;
  jobId?: string;
  since?: string; // ISO date
}

export const RECRUITMENT_SESSIONS_KEY = "recruitment-sessions";

export function useRecruitmentSessions(filters: SessionFilters | null) {
  return useQuery({
    queryKey: [RECRUITMENT_SESSIONS_KEY, filters?.accountId, filters?.jobId, filters?.since],
    queryFn: () => fetchUnifiedSessions(filters!),
    enabled: !!filters?.accountId,
    staleTime: 30_000,
  });
}

const MAX_DURATION_SECONDS = 4 * 60 * 60; // 4h cap to ignore zombie sessions

/**
 * Display-side duration fallback. Mirrors the server-side priority chain in
 * supabase/functions/_shared/computeInterviewDuration.ts (minus tokenUsage,
 * which isn't queried on the client). Used so sessions where the backend
 * couldn't persist duration_seconds (older rows, watchdog edge cases) still
 * show a sensible value instead of "-".
 */
function computeDisplayDuration(s: {
  duration_seconds?: number | null;
  last_activity_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}): number | null {
  const persisted = Number(s.duration_seconds);
  if (Number.isFinite(persisted) && persisted > 0) return Math.min(persisted, MAX_DURATION_SECONDS);
  const startedMs = s.started_at ? new Date(s.started_at).getTime() : NaN;
  const lastActivityMs = s.last_activity_at ? new Date(s.last_activity_at).getTime() : NaN;
  if (Number.isFinite(startedMs) && Number.isFinite(lastActivityMs) && lastActivityMs > startedMs) {
    const v = Math.floor((lastActivityMs - startedMs) / 1000);
    if (v >= 1) return Math.min(v, MAX_DURATION_SECONDS);
  }
  const completedMs = s.completed_at ? new Date(s.completed_at).getTime() : NaN;
  if (Number.isFinite(startedMs) && Number.isFinite(completedMs) && completedMs > startedMs) {
    const v = Math.floor((completedMs - startedMs) / 1000);
    if (v >= 1) return Math.min(v, MAX_DURATION_SECONDS);
  }
  return null;
}

async function fetchUnifiedSessions(filters: SessionFilters): Promise<UnifiedSession[]> {
  const { accountId, jobId, since } = filters;

  // Build queries with optional filters
  let cultureQ = supabase
    .from("culture_interview_sessions")
    .select("id, account_id, job_id, candidate_id, candidate_profile_id, agent_id, status, matching_score, duration_seconds, created_at, completed_at, started_at, last_activity_at, email_sent_at, reused_from_session_id, attempt_number")
    .eq("account_id", accountId)
    .is("archived_at", null);
  let discQ = supabase
    .from("candidate_disc_sessions")
    .select("id, account_id, job_id, candidate_id, candidate_profile_id, agent_id, status, created_at, completed_at, started_at, reused_from_session_id, attempt_number")
    .eq("account_id", accountId)
    .is("archived_at", null);
  let techQ = supabase
    .from("technical_interview_sessions")
    .select("id, account_id, job_id, candidate_id, candidate_profile_id, agent_id, status, overall_score, duration_seconds, created_at, completed_at, started_at, last_activity_at, attempt_number")
    .eq("account_id", accountId)
    .is("archived_at", null);
  let archivedQ = supabase
    .from("interview_attempt_history")
    .select("id, account_id, job_id, candidate_id, candidate_profile_id, session_type, attempt_number, score, status, started_at, completed_at, archived_at, created_at, original_session_id")
    .eq("account_id", accountId);

  if (jobId) {
    cultureQ = cultureQ.eq("job_id", jobId);
    discQ = discQ.eq("job_id", jobId);
    techQ = techQ.eq("job_id", jobId);
    archivedQ = archivedQ.eq("job_id", jobId);
  }
  if (since) {
    cultureQ = cultureQ.gte("created_at", since);
    discQ = discQ.gte("created_at", since);
    techQ = techQ.gte("created_at", since);
    archivedQ = archivedQ.gte("created_at", since);
  }

  const [cultureRes, discRes, techRes, archivedRes] = await Promise.all([
    cultureQ.order("created_at", { ascending: false }),
    discQ.order("created_at", { ascending: false }),
    techQ.order("created_at", { ascending: false }),
    archivedQ.order("created_at", { ascending: false }),
  ]);

  const cultureSessions = cultureRes.data || [];
  const discSessions = discRes.data || [];
  const techSessions = techRes.data || [];
  const archivedSessions = (archivedRes.data || []) as any[];

  // Fetch DISC scores via RPC
  const discSessionIds = discSessions.map(s => s.id);
  let discScoreMap = new Map<string, number>();
  if (discSessionIds.length > 0) {
    const { data: discScores } = await supabase.rpc("get_disc_match_scores", { p_session_ids: discSessionIds });
    discScoreMap = new Map((discScores || []).map((r: any) => [r.session_id, r.match_score]));
  }

  // Collect all IDs for batch resolution
  const allRawSessions = [
    ...cultureSessions.map(s => ({ ...s, _type: "cultural" as const, _score: (s as any).matching_score, _duration: computeDisplayDuration(s as any), _emailSent: (s as any).email_sent_at, _reusedFrom: (s as any).reused_from_session_id ?? null, _archived: false, _attemptNumber: (s as any).attempt_number ?? null })),
    ...discSessions.map(s => ({ ...s, _type: "disc" as const, _score: discScoreMap.get(s.id) ?? null, _duration: null as number | null, _emailSent: null as string | null, _reusedFrom: (s as any).reused_from_session_id ?? null, _archived: false, _attemptNumber: (s as any).attempt_number ?? null })),
    ...techSessions.map(s => ({ ...s, _type: "technical" as const, _score: (s as any).overall_score, _duration: computeDisplayDuration(s as any), _emailSent: null as string | null, _reusedFrom: null as string | null, _archived: false, _attemptNumber: (s as any).attempt_number ?? null })),
    ...archivedSessions.map(s => {
      const t = (s.session_type as UnifiedSessionType) || "cultural";
      const dur = s.completed_at && s.started_at
        ? Math.floor((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 1000)
        : null;
      // Normalize archived score: cultural/technical use 0-100, but interview_attempt_history.score is already on raw scale used at archive time
      const score = s.score !== null && s.score !== undefined ? Number(s.score) : null;
      return {
        id: s.original_session_id || s.id,
        account_id: s.account_id,
        job_id: s.job_id,
        candidate_id: s.candidate_id,
        candidate_profile_id: s.candidate_profile_id,
        agent_id: null as string | null,
        status: s.status || "archived",
        created_at: s.created_at,
        completed_at: s.completed_at,
        started_at: s.started_at,
        _type: t,
        _score: score,
        _duration: dur,
        _emailSent: null as string | null,
        _reusedFrom: null as string | null,
        _archived: true,
        _attemptNumber: s.attempt_number ?? null,
      };
    }),
  ];

  if (allRawSessions.length === 0) return [];

  const candidateProfileIds = [...new Set(allRawSessions.map(s => s.candidate_profile_id).filter(Boolean))] as string[];
  const candidateIds = [...new Set(allRawSessions.map(s => s.candidate_id).filter(Boolean))] as string[];
  const jobIds = [...new Set(allRawSessions.map(s => s.job_id).filter(Boolean))] as string[];
  const agentIds = [...new Set(allRawSessions.map(s => s.agent_id).filter(Boolean))] as string[];

  const [profilesRes, candidatesRes, jobsRes, applicationsRes] = await Promise.all([
    candidateProfileIds.length > 0
      ? supabase.from("candidate_profiles").select("id, full_name, user_id, phone").in("id", candidateProfileIds)
      : { data: [] as any[] },
    candidateIds.length > 0
      ? supabase.from("recruitment_candidates").select("id, email, first_name, last_name, phone").in("id", candidateIds)
      : { data: [] as any[] },
    jobIds.length > 0
      ? supabase.from("recruitment_jobs").select("id, title, agent_id").in("id", jobIds)
      : { data: [] as any[] },
    candidateIds.length > 0 && jobIds.length > 0
      ? supabase.from("recruitment_applications").select("id, candidate_id, job_id").eq("account_id", accountId).in("candidate_id", candidateIds).in("job_id", jobIds)
      : { data: [] as any[] },
  ]);

  // Resolve job agent IDs too
  const jobAgentIds = (jobsRes.data || []).map((j: any) => j.agent_id).filter(Boolean) as string[];
  const allAgentIds = [...new Set([...agentIds, ...jobAgentIds])];

  const [agentsRes, userProfilesRes] = await Promise.all([
    allAgentIds.length > 0
      ? supabase.from("recruitment_agents").select("id, name").in("id", allAgentIds)
      : { data: [] as any[] },
    (() => {
      const userIds = (profilesRes.data || []).map((p: any) => p.user_id).filter(Boolean) as string[];
      return userIds.length > 0
        ? supabase.from("profiles").select("id, email").in("id", userIds)
        : { data: [] as any[] };
    })(),
  ]);

  // Build lookup maps
  const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
  const candidatesMap = new Map((candidatesRes.data || []).map((c: any) => [c.id, c]));
  const jobsMap = new Map((jobsRes.data || []).map((j: any) => [j.id, j]));
  const agentsMap = new Map((agentsRes.data || []).map((a: any) => [a.id, a]));
  const userEmailsMap = new Map((userProfilesRes.data || []).map((p: any) => [p.id, p.email]));

  // Application map: "candidateId|jobId" -> applicationId
  const appMap = new Map<string, string>();
  (applicationsRes.data || []).forEach((a: any) => {
    appMap.set(`${a.candidate_id}|${a.job_id}`, a.id);
  });

  return allRawSessions.map(session => {
    const profile = session.candidate_profile_id ? profilesMap.get(session.candidate_profile_id) : null;
    const candidate = session.candidate_id ? candidatesMap.get(session.candidate_id) : null;
    const job = session.job_id ? jobsMap.get(session.job_id) : null;
    const effectiveAgentId = session.agent_id || job?.agent_id;
    const agent = effectiveAgentId ? agentsMap.get(effectiveAgentId) : null;
    const emailFromProfile = profile?.user_id ? userEmailsMap.get(profile.user_id) : null;

    const candidateName = profile?.full_name
      || (candidate ? (candidate.name || `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim()) : "Candidato");

    return {
      id: session.id,
      type: session._type,
      candidateId: session.candidate_id || "",
      candidateProfileId: session.candidate_profile_id || null,
      candidateName,
      candidateEmail: emailFromProfile || candidate?.email || "",
      candidatePhone: profile?.phone || candidate?.phone || "",
      jobId: session.job_id || "",
      jobTitle: job?.title || "Vaga",
      agentId: effectiveAgentId || null,
      agentName: agent?.name || (session._type === "disc" ? "Agente DISC" : "Agente IA"),
      applicationId: (() => {
        let resolvedAppId = appMap.get(`${session.candidate_id}|${session.job_id}`) || null;
        if (!resolvedAppId && session.candidate_profile_id) {
          const prof = profilesMap.get(session.candidate_profile_id);
          const email = prof?.user_id ? userEmailsMap.get(prof.user_id) : null;
          if (email) {
            const matchingCandidate = [...candidatesMap.values()].find((c: any) => c.email === email);
            if (matchingCandidate) {
              resolvedAppId = appMap.get(`${matchingCandidate.id}|${session.job_id}`) || null;
            }
          }
        }
        return resolvedAppId;
      })(),
      status: session.status || "pending",
      score: session._score,
      durationSeconds: session._duration,
      createdAt: new Date(session.created_at || Date.now()),
      completedAt: session.completed_at ? new Date(session.completed_at) : null,
      startedAt: session.started_at ? new Date(session.started_at) : null,
      emailSentAt: session._emailSent || null,
      reusedFromSessionId: session._reusedFrom || null,
      isArchived: session._archived === true,
      attemptNumber: session._attemptNumber ?? null,
    } satisfies UnifiedSession;
  });
}
