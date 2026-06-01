/**
 * Helper utilities for E2E recruitment tests.
 * Queries the database via Supabase client to find existing test data.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface TestJobData {
  jobId: string;
  accountId: string;
  jobTitle: string;
  workflowSteps: string[];
}

export interface TestCandidateData {
  candidateId: string;
  email: string;
  name: string;
  applicationId: string | null;
  hasCulturalComplete: boolean;
  hasDISCComplete: boolean;
  hasTechnicalComplete: boolean;
  isDisqualified: boolean;
}

/**
 * Find an active job with a multi-step workflow.
 */
export async function findActiveJobWithWorkflow(): Promise<TestJobData | null> {
  const { data: steps } = await supabase
    .from("recruitment_job_workflow_steps")
    .select("job_id, step_type")
    .eq("is_active", true);

  if (!steps || steps.length === 0) return null;

  const jobSteps = new Map<string, string[]>();
  for (const s of steps) {
    if (!jobSteps.has(s.job_id)) jobSteps.set(s.job_id, []);
    jobSteps.get(s.job_id)!.push(s.step_type);
  }

  // Prefer jobs with all 3 assessment steps
  let targetJobId: string | null = null;
  let targetSteps: string[] = [];

  for (const [jid, types] of jobSteps) {
    if (types.includes("cultural") && types.includes("disc") && types.includes("technical")) {
      targetJobId = jid;
      targetSteps = types;
      break;
    }
  }

  if (!targetJobId) {
    // Fallback: any job with at least 2 steps
    for (const [jid, types] of jobSteps) {
      if (types.length >= 2) {
        targetJobId = jid;
        targetSteps = types;
        break;
      }
    }
  }

  if (!targetJobId) return null;

  const { data: job } = await supabase
    .from("recruitment_jobs")
    .select("id, title, account_id")
    .eq("id", targetJobId)
    .single();

  if (!job) return null;

  return {
    jobId: job.id,
    accountId: job.account_id,
    jobTitle: job.title,
    workflowSteps: targetSteps,
  };
}

/**
 * Find a candidate with an application for a given job.
 */
export async function findCandidateForJob(jobId: string): Promise<TestCandidateData | null> {
  const { data: app } = await supabase
    .from("recruitment_applications")
    .select("id, candidate_id, status")
    .eq("job_id", jobId)
    .limit(1)
    .maybeSingle();

  if (!app) return null;

  const { data: candidate } = await supabase
    .from("recruitment_candidates")
    .select("id, first_name, last_name, email")
    .eq("id", app.candidate_id)
    .single();

  if (!candidate) return null;

  // Check completed sessions
  const { data: cultural } = await supabase
    .from("culture_interview_sessions")
    .select("id")
    .eq("candidate_id", candidate.id)
    .eq("job_id", jobId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  const { data: disc } = await supabase
    .from("candidate_disc_sessions")
    .select("id")
    .eq("candidate_id", candidate.id)
    .eq("job_id", jobId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  const { data: tech } = await supabase
    .from("technical_interview_sessions")
    .select("id")
    .eq("candidate_id", candidate.id)
    .eq("job_id", jobId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  return {
    candidateId: candidate.id,
    email: candidate.email,
    name: `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim(),
    applicationId: app.id,
    hasCulturalComplete: !!cultural,
    hasDISCComplete: !!disc,
    hasTechnicalComplete: !!tech,
    isDisqualified: app.status === "desqualificado",
  };
}
