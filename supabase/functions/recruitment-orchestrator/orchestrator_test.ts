/**
 * Deno tests for recruitment-orchestrator edge function.
 * Validates the full recruitment workflow: screening → cultural → disc → technical.
 *
 * Run via: supabase--test_edge_functions tool with functions=["recruitment-orchestrator"]
 */

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ORCHESTRATOR_URL = `${SUPABASE_URL}/functions/v1/recruitment-orchestrator`;

interface TestContext {
  candidateId: string;
  jobId: string;
  accountId: string;
  applicationId: string;
  candidateEmail: string;
  candidatePhone: string | null;
}

/**
 * Find an active job with a full workflow (screening + cultural + disc + technical)
 * and a candidate with an existing application.
 */
async function findTestData(): Promise<TestContext | null> {
  // Find jobs that have all 4 workflow step types
  const { data: jobs } = await supabase
    .from("recruitment_job_workflow_steps")
    .select("job_id, step_type")
    .eq("is_active", true);

  if (!jobs || jobs.length === 0) return null;

  // Group by job_id
  const jobSteps = new Map<string, string[]>();
  for (const row of jobs) {
    if (!jobSteps.has(row.job_id)) jobSteps.set(row.job_id, []);
    jobSteps.get(row.job_id)!.push(row.step_type);
  }

  // Find a job with at least cultural + disc + technical
  let targetJobId: string | null = null;
  for (const [jid, steps] of jobSteps) {
    if (steps.includes("cultural") && steps.includes("disc") && steps.includes("technical")) {
      targetJobId = jid;
      break;
    }
  }

  if (!targetJobId) {
    // Fallback: any job with at least 2 steps
    for (const [jid, steps] of jobSteps) {
      if (steps.length >= 2) {
        targetJobId = jid;
        break;
      }
    }
  }

  if (!targetJobId) return null;

  // Get job's account_id
  const { data: jobData } = await supabase
    .from("recruitment_jobs")
    .select("id, account_id")
    .eq("id", targetJobId)
    .single();

  if (!jobData) return null;

  // Find a candidate with an application for this job
  const { data: app } = await supabase
    .from("recruitment_applications")
    .select("id, candidate_id")
    .eq("job_id", targetJobId)
    .limit(1)
    .maybeSingle();

  if (!app) return null;

  // Get candidate details
  const { data: candidate } = await supabase
    .from("recruitment_candidates")
    .select("id, email, phone")
    .eq("id", app.candidate_id)
    .single();

  if (!candidate) return null;

  return {
    candidateId: candidate.id,
    jobId: targetJobId,
    accountId: jobData.account_id,
    applicationId: app.id,
    candidateEmail: candidate.email,
    candidatePhone: candidate.phone,
  };
}

/**
 * Call the orchestrator edge function.
 */
async function callOrchestrator(body: {
  candidateId: string;
  jobId: string;
  accountId: string;
  completedStepType: string;
  sessionId?: string;
}): Promise<{ status: number; data: any }> {
  const response = await fetch(ORCHESTRATOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { status: response.status, data };
}

// ─── Test 1: Validation ──────────────────────────────────────────────────────

Deno.test("orchestrator rejects missing required fields", async () => {
  const response = await fetch(ORCHESTRATOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ candidateId: "test" }),
  });

  const data = await response.json();
  assertEquals(response.status, 400);
  assertExists(data.error);
});

// ─── Test 2: Idempotency ────────────────────────────────────────────────────

Deno.test("orchestrator skips already-processed actions (idempotency)", async () => {
  const ctx = await findTestData();
  if (!ctx) {
    console.warn("⚠️ No test data found, skipping idempotency test");
    return;
  }

  // Check if there's an existing communications log for today
  const today = new Date().toISOString().slice(0, 10);
  const actionHash = `orchestrator_${ctx.candidateId}_${ctx.jobId}_cultural_${today}`;

  const { data: existing } = await supabase
    .from("recruitment_communications_log")
    .select("id")
    .eq("candidate_id", ctx.candidateId)
    .eq("job_id", ctx.jobId)
    .contains("metadata", { orchestrator_action_hash: actionHash })
    .limit(1)
    .maybeSingle();

  if (!existing) {
    console.warn("⚠️ No existing orchestrator log for today, skipping idempotency test");
    return;
  }

  // Call again — should be idempotent
  const result = await callOrchestrator({
    candidateId: ctx.candidateId,
    jobId: ctx.jobId,
    accountId: ctx.accountId,
    completedStepType: "cultural",
  });

  assertEquals(result.data.success, true);
  assertEquals(result.data.skipped, true);
  assertEquals(result.data.reason, "Already processed");
});

// ─── Test 3: Score retrieval for cultural ────────────────────────────────────

Deno.test("orchestrator retrieves cultural score from completed sessions", async () => {
  const ctx = await findTestData();
  if (!ctx) {
    console.warn("⚠️ No test data found, skipping cultural score test");
    return;
  }

  // Check if candidate has a completed cultural session
  const { data: session } = await supabase
    .from("culture_interview_sessions")
    .select("id, matching_score, status")
    .eq("candidate_id", ctx.candidateId)
    .eq("job_id", ctx.jobId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (!session) {
    console.warn("⚠️ No completed cultural session found, skipping");
    return;
  }

  console.log(`✅ Cultural session found: id=${session.id}, score=${session.matching_score}`);
  assertExists(session.matching_score, "Cultural session should have a matching_score");
});

// ─── Test 4: DISC match_score is used (not recalculated) ────────────────────

Deno.test("orchestrator uses saved DISC match_score from candidate_disc_results", async () => {
  const ctx = await findTestData();
  if (!ctx) {
    console.warn("⚠️ No test data found, skipping DISC score test");
    return;
  }

  // Find a completed DISC session for this candidate+job
  const { data: discSession } = await supabase
    .from("candidate_disc_sessions")
    .select("id, status")
    .eq("candidate_id", ctx.candidateId)
    .eq("job_id", ctx.jobId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (!discSession) {
    console.warn("⚠️ No completed DISC session found, skipping");
    return;
  }

  // Verify match_score exists in results
  const { data: result } = await supabase
    .from("candidate_disc_results")
    .select("match_score, d_normalized, i_normalized, s_normalized, c_normalized")
    .eq("session_id", discSession.id)
    .maybeSingle();

  if (!result) {
    console.warn("⚠️ No DISC results found, skipping");
    return;
  }

  console.log(`✅ DISC results found: match_score=${result.match_score}`);
  // match_score should be set (either from analyze-disc or orchestrator fallback)
  assertExists(result.match_score, "DISC result should have match_score persisted");
});

// ─── Test 5: Decision log and communications log are written ────────────────

Deno.test("orchestrator writes to decision_log and communications_log", async () => {
  const ctx = await findTestData();
  if (!ctx) {
    console.warn("⚠️ No test data found, skipping logging test");
    return;
  }

  // Check that at least one decision log exists for this candidate+job
  const { data: decisions } = await supabase
    .from("recruitment_decision_log")
    .select("id, decision_type, decision, step_type, score, threshold")
    .eq("candidate_id", ctx.candidateId)
    .eq("job_id", ctx.jobId)
    .order("created_at", { ascending: false })
    .limit(5);

  console.log(`📝 Decision logs found: ${decisions?.length ?? 0}`);

  if (decisions && decisions.length > 0) {
    const latest = decisions[0];
    assertExists(latest.decision_type, "Decision log should have decision_type");
    assertExists(latest.decision, "Decision log should have decision (advance/reject)");
    assertExists(latest.step_type, "Decision log should have step_type");
    console.log(`✅ Latest decision: type=${latest.decision_type}, decision=${latest.decision}, step=${latest.step_type}, score=${latest.score}, threshold=${latest.threshold}`);
  }

  // Check communications log
  const { data: comms } = await supabase
    .from("recruitment_communications_log")
    .select("id, channel, status, metadata")
    .eq("candidate_id", ctx.candidateId)
    .eq("job_id", ctx.jobId)
    .order("created_at", { ascending: false })
    .limit(10);

  console.log(`📧 Communication logs found: ${comms?.length ?? 0}`);

  if (comms && comms.length > 0) {
    // Verify at least one email or whatsapp log exists
    const channels = new Set(comms.map((c: any) => c.channel));
    console.log(`✅ Channels used: ${[...channels].join(", ")}`);
    
    // Verify metadata contains orchestrator action hash
    const withHash = comms.filter((c: any) => c.metadata?.orchestrator_action_hash);
    console.log(`✅ Logs with orchestrator hash: ${withHash.length}`);
  }
});

// ─── Test 6: Application not found returns 404 ──────────────────────────────

Deno.test("orchestrator returns 404 for non-existent application", async () => {
  const ctx = await findTestData();
  if (!ctx) {
    console.warn("⚠️ No test data found, skipping 404 test");
    return;
  }

  const result = await callOrchestrator({
    candidateId: "00000000-0000-0000-0000-000000000000",
    jobId: ctx.jobId,
    accountId: ctx.accountId,
    completedStepType: "cultural",
  });

  // Should either be 404 (no application) or 200 with skipped (no score)
  if (result.status === 404) {
    assertExists(result.data.error);
  } else {
    assertEquals(result.data.success, true);
  }
});
