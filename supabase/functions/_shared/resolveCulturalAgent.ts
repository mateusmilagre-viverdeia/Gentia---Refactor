// Shared helper: resolve the cultural agent_id for a culture_interview_sessions row.
//
// Resolution order (first non-null wins):
//   1. fallbackId (e.g. caller-provided body.agent_id)
//   2. recruitment_job_workflow_steps where job_id = ? AND step_type = 'cultural' AND is_active = true
//   3. recruitment_jobs.agent_id
//   4. any active agent of the account with type IN ('cultural','structured')
//   5. null  (caller decides whether to error/warn)
//
// Logs each level reached so we have telemetry parity with the fallback chain in
// culture-interview-complete / reprocess-culture-evaluation (Fase 1).
//
// NOTE: pass a SERVICE_ROLE supabase client. RLS would block agent reads otherwise.

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export interface ResolveResult {
  agentId: string | null;
  level: 1 | 2 | 3 | 4 | null;
  source: "caller" | "workflow_step" | "recruitment_job" | "account_default" | "none";
}

export async function resolveCulturalAgentId(
  supabase: SupabaseLike,
  params: { jobId: string; accountId: string; fallbackId?: string | null },
): Promise<ResolveResult> {
  const { jobId, accountId, fallbackId } = params;

  // 1. caller-provided
  if (fallbackId) {
    return { agentId: fallbackId, level: 1, source: "caller" };
  }

  // 2. workflow step
  try {
    const { data: step } = await supabase
      .from("recruitment_job_workflow_steps")
      .select("agent_id")
      .eq("job_id", jobId)
      .eq("step_type", "cultural")
      .eq("is_active", true)
      .not("agent_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (step?.agent_id) {
      return { agentId: step.agent_id, level: 2, source: "workflow_step" };
    }
  } catch (e) {
    console.warn("[resolveCulturalAgentId] workflow_step lookup failed", e);
  }

  // 3. recruitment_jobs.agent_id
  try {
    const { data: job } = await supabase
      .from("recruitment_jobs")
      .select("agent_id")
      .eq("id", jobId)
      .maybeSingle();
    if (job?.agent_id) {
      return { agentId: job.agent_id, level: 3, source: "recruitment_job" };
    }
  } catch (e) {
    console.warn("[resolveCulturalAgentId] recruitment_jobs lookup failed", e);
  }

  // 4. account default — any active cultural/structured agent
  try {
    const { data: anyAgent } = await supabase
      .from("recruitment_agents")
      .select("id")
      .eq("account_id", accountId)
      // Taxonomia real: agente cultural = type 'structured' ('cultural' não existe em recruitment_agents).
      .eq("type", "structured")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (anyAgent?.id) {
      return { agentId: anyAgent.id, level: 4, source: "account_default" };
    }
  } catch (e) {
    console.warn("[resolveCulturalAgentId] account default lookup failed", e);
  }

  return { agentId: null, level: null, source: "none" };
}
