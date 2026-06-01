// Lista as últimas sessões culturais (reais + simulações) com dados de
// cobertura/aderência para a aba de auditoria em /admin/platform.
// Retorna: % de cobertura, perguntas faltantes, transcript, status.
// AUTH: super admin OR membro da account.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    const accountIdParam = url.searchParams.get("accountId");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const includeTestParam = (url.searchParams.get("includeTest") ?? "true").toLowerCase() !== "false";
    const onlyTest = (url.searchParams.get("onlyTest") ?? "false").toLowerCase() === "true";
    const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);

    const { data: isSuperAdminData } = await supabaseAdmin.rpc("is_super_admin", { _user_id: userId });
    const isSuperAdmin = !!isSuperAdminData;

    // Build account scope
    let allowedAccountIds: string[] | null = null;
    if (!isSuperAdmin) {
      const { data: memberships } = await supabaseAdmin
        .from("account_members")
        .select("account_id")
        .eq("user_id", userId);
      allowedAccountIds = (memberships || []).map((m: any) => m.account_id);
      if (allowedAccountIds.length === 0) {
        return new Response(JSON.stringify({ sessions: [], total: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let q = supabaseAdmin
      .from("culture_interview_sessions")
      .select(`
        id, account_id, job_id, candidate_id, status, is_test,
        questions_total, questions_covered, coverage_log, duration_seconds,
        started_at, completed_at, created_at, partial_transcript,
        matching_score, recommendation, abandoned_reason
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (onlyTest) q = q.eq("is_test", true);
    else if (!includeTestParam) q = q.eq("is_test", false);

    if (jobId) q = q.eq("job_id", jobId);
    if (accountIdParam) q = q.eq("account_id", accountIdParam);
    else if (allowedAccountIds) q = q.in("account_id", allowedAccountIds);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);

    const { data: sessions, error } = await q;
    if (error) {
      console.error("audit query error:", error);
      return new Response(JSON.stringify({ error: "QUERY_FAILED", message: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Manual joins (no FK relationship defined in PostgREST cache)
    const jobIds = Array.from(new Set((sessions || []).map((s: any) => s.job_id).filter(Boolean)));
    const candidateIds = Array.from(new Set((sessions || []).map((s: any) => s.candidate_id).filter(Boolean)));

    const [{ data: jobsData }, { data: candidatesData }] = await Promise.all([
      jobIds.length
        ? supabaseAdmin.from("recruitment_jobs").select("id, title").in("id", jobIds)
        : Promise.resolve({ data: [] as any[] }),
      candidateIds.length
        ? supabaseAdmin.from("recruitment_candidates").select("id, first_name, last_name, email, is_test").in("id", candidateIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const jobsMap = new Map((jobsData || []).map((j: any) => [j.id, j]));
    const candidatesMap = new Map((candidatesData || []).map((c: any) => [c.id, c]));

    const enrichedSessions = (sessions || []).map((s: any) => ({
      ...s,
      job: jobsMap.get(s.job_id) || null,
      candidate: candidatesMap.get(s.candidate_id) || null,
    }));

    // Aggregate "least-covered question" stats across the returned set
    const questionStats = new Map<number, { covered: number; total: number; label: string }>();
    for (const s of sessions || []) {
      const total = s.questions_total ?? 0;
      const log = (s.coverage_log as Array<{ question_index: number }>) || [];
      const coveredIdx = new Set(log.map((c) => c.question_index));
      for (let i = 0; i < total; i++) {
        const cur = questionStats.get(i) || { covered: 0, total: 0, label: `Pergunta ${i + 1}` };
        cur.total += 1;
        if (coveredIdx.has(i)) cur.covered += 1;
        questionStats.set(i, cur);
      }
    }

    const aggregate = Array.from(questionStats.entries())
      .map(([idx, v]) => ({
        question_index: idx,
        label: v.label,
        sessions_covered: v.covered,
        sessions_total: v.total,
        coverage_pct: v.total ? Math.round((v.covered / v.total) * 100) : 0,
      }))
      .sort((a, b) => a.coverage_pct - b.coverage_pct);

    return new Response(JSON.stringify({
      sessions: enrichedSessions,
      total: enrichedSessions.length,
      aggregate,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("audit-culture-adherence error:", e);
    return new Response(JSON.stringify({
      error: "INTERNAL_ERROR",
      message: e instanceof Error ? e.message : String(e),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
