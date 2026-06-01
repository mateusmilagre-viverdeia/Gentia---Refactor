import { useMemo } from "react";
import type { UnifiedSession } from "./useRecruitmentSessions";

export type FunnelStage = "screening" | "cultural" | "disc" | "technical" | "approved";

export interface UnifiedCandidate {
  candidateId: string;
  candidateProfileId: string | null;
  name: string;
  email: string;
  jobId: string;
  jobTitle: string;
  applicationId: string | null;
  cultureSessionId: string | null;
  screeningCompleted: boolean;
  screeningPassed: boolean;
  cultureCompleted: boolean;
  discCompleted: boolean;
  techCompleted: boolean;
  cultureScore: number | null;
  discScore: number | null;
  techScore: number | null;
  cultureReused: boolean;
  discReused: boolean;
  enteredAt: Date;
  currentStage: FunnelStage;
}

interface WorkflowStep {
  job_id: string;
  step_type: string;
}

interface ScreeningResult {
  candidate_id: string;
  job_id: string;
  passed: boolean;
}

/**
 * Build a candidate map from unified sessions, workflow steps, and screening results.
 * Centralizes all "which stage is this candidate in?" logic.
 */
export function buildCandidateMap(
  sessions: UnifiedSession[],
  workflowSteps: WorkflowStep[],
  screeningResults?: ScreeningResult[],
): Map<string, UnifiedCandidate> {
  // Build job → step types map
  const jobStepsMap = new Map<string, string[]>();
  for (const ws of workflowSteps) {
    if (!jobStepsMap.has(ws.job_id)) {
      jobStepsMap.set(ws.job_id, []);
    }
    jobStepsMap.get(ws.job_id)!.push(ws.step_type);
  }

  const candidateMap = new Map<string, UnifiedCandidate>();
  const getKey = (cid: string, jid: string) => `${cid}|${jid}`;

  const ensureCandidate = (s: UnifiedSession): UnifiedCandidate => {
    const key = getKey(s.candidateId, s.jobId);
    if (!candidateMap.has(key)) {
      candidateMap.set(key, {
        candidateId: s.candidateId,
        candidateProfileId: s.candidateProfileId,
        name: s.candidateName,
        email: s.candidateEmail,
        jobId: s.jobId,
        jobTitle: s.jobTitle,
        applicationId: s.applicationId,
        cultureSessionId: null,
        screeningCompleted: false,
        screeningPassed: false,
        cultureCompleted: false,
        discCompleted: false,
        techCompleted: false,
        cultureScore: null,
        discScore: null,
        techScore: null,
        cultureReused: false,
        discReused: false,
        enteredAt: s.createdAt,
        currentStage: "screening",
      });
    }
    const c = candidateMap.get(key)!;
    // Update name/email/applicationId if better data available
    if (s.candidateName && s.candidateName !== "Candidato") c.name = s.candidateName;
    if (s.candidateEmail) c.email = s.candidateEmail;
    if (s.applicationId) c.applicationId = s.applicationId;
    if (s.candidateProfileId) c.candidateProfileId = s.candidateProfileId;
    if (s.createdAt < c.enteredAt) c.enteredAt = s.createdAt;
    return c;
  };

  for (const s of sessions) {
    if (!s.candidateId) continue;
    const c = ensureCandidate(s);

    if (s.type === "cultural" && s.status === "completed") {
      c.cultureCompleted = true;
      c.cultureScore = s.score;
      c.cultureSessionId = s.id;
      if (s.reusedFromSessionId) c.cultureReused = true;
    } else if (s.type === "cultural") {
      c.cultureSessionId = c.cultureSessionId || s.id;
    }

    if (s.type === "disc" && s.status === "completed" && s.score != null) {
      c.discCompleted = true;
      c.discScore = s.score;
      if (s.reusedFromSessionId) c.discReused = true;
    }

    if (s.type === "technical" && s.status === "completed") {
      c.techCompleted = true;
      c.techScore = s.score;
    }
  }

  // Process screening results
  if (screeningResults) {
    for (const sr of screeningResults) {
      if (!sr.candidate_id || !sr.job_id) continue;
      const key = getKey(sr.candidate_id, sr.job_id);
      const c = candidateMap.get(key);
      if (c) {
        c.screeningCompleted = true;
        c.screeningPassed = sr.passed === true;
      }
    }
  }

  // Compute current stage for each candidate
  for (const c of candidateMap.values()) {
    const stepTypes = jobStepsMap.get(c.jobId) || [];
    c.currentStage = resolveStage(c, stepTypes);
  }

  // Defensive merge: consolidate duplicate recruitment_candidates that represent
  // the same person on the same job. Groups by (candidateProfileId|jobId) when
  // available, otherwise by (normalized email|jobId), otherwise by (normalized
  // name|jobId). Keeps the oldest entry as canonical and merges completion
  // flags/scores so the candidate appears only at the most-advanced stage.
  // Prevents bugs like duplicate rows from invites sent to alternate emails.
  const groupKeyOf = (c: UnifiedCandidate): string | null => {
    if (c.candidateProfileId) return `p:${c.candidateProfileId}|${c.jobId}`;
    const email = (c.email || "").trim().toLowerCase();
    if (email) return `e:${email}|${c.jobId}`;
    const name = (c.name || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (name && name !== "candidato") return `n:${name}|${c.jobId}`;
    return null;
  };

  const groups = new Map<string, UnifiedCandidate[]>();
  for (const c of candidateMap.values()) {
    const k = groupKeyOf(c);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    // Canonical = oldest entry
    group.sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime());
    const canonical = group[0];
    for (let i = 1; i < group.length; i++) {
      const dup = group[i];
      canonical.cultureCompleted = canonical.cultureCompleted || dup.cultureCompleted;
      canonical.discCompleted = canonical.discCompleted || dup.discCompleted;
      canonical.techCompleted = canonical.techCompleted || dup.techCompleted;
      canonical.screeningCompleted = canonical.screeningCompleted || dup.screeningCompleted;
      canonical.screeningPassed = canonical.screeningPassed || dup.screeningPassed;
      if (canonical.cultureScore == null && dup.cultureScore != null) canonical.cultureScore = dup.cultureScore;
      if (canonical.discScore == null && dup.discScore != null) canonical.discScore = dup.discScore;
      if (canonical.techScore == null && dup.techScore != null) canonical.techScore = dup.techScore;
      if (!canonical.cultureSessionId && dup.cultureSessionId) canonical.cultureSessionId = dup.cultureSessionId;
      if (!canonical.applicationId && dup.applicationId) canonical.applicationId = dup.applicationId;
      if (!canonical.candidateProfileId && dup.candidateProfileId) canonical.candidateProfileId = dup.candidateProfileId;
      // Remove duplicate from the map
      candidateMap.delete(`${dup.candidateId}|${dup.jobId}`);
    }
    // Recompute stage after merge
    const stepTypes = jobStepsMap.get(canonical.jobId) || [];
    canonical.currentStage = resolveStage(canonical, stepTypes);
  }

  return candidateMap;
}

function resolveStage(c: UnifiedCandidate, stepTypes: string[]): FunnelStage {
  const needsScreening = stepTypes.includes("screening");
  const needsCulture = stepTypes.includes("cultural");
  const needsDisc = stepTypes.includes("disc");
  const needsTech = stepTypes.includes("technical");

  if (needsScreening && !c.screeningCompleted) return "screening";
  if (needsCulture && !c.cultureCompleted) return "cultural";
  if (needsDisc && !c.discCompleted) return "disc";
  if (needsTech && !c.techCompleted) return "technical";
  return "approved";
}

/**
 * React hook wrapper around buildCandidateMap for convenient use in components.
 */
export function useRecruitmentCandidateMap(
  sessions: UnifiedSession[] | undefined,
  workflowSteps: WorkflowStep[] | undefined,
  screeningResults?: ScreeningResult[],
) {
  return useMemo(() => {
    if (!sessions || !workflowSteps) return new Map<string, UnifiedCandidate>();
    return buildCandidateMap(sessions, workflowSteps, screeningResults);
  }, [sessions, workflowSteps, screeningResults]);
}
