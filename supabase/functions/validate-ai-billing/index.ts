import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  from?: string; // ISO date
  to?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate caller is super admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isSA } = await supabaseAdmin.rpc("is_super_admin", { _user_id: userData.user.id });
    if (!isSA) {
      return new Response(JSON.stringify({ error: "Super admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const to = body.to ? new Date(body.to) : new Date();
    const from = body.from ? new Date(body.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    // 1. Interview coverage
    const [cultureSess, techSess, tokenUsage, usageLog, aiLogs, creditConfig] = await Promise.all([
      supabaseAdmin.from("culture_interview_sessions")
        .select("id, account_id, status, duration_seconds, completed_at, started_at")
        .eq("status", "completed")
        .gte("completed_at", fromIso).lte("completed_at", toIso),
      supabaseAdmin.from("technical_interview_sessions")
        .select("id, account_id, status, duration_seconds, completed_at, started_at")
        .eq("status", "completed")
        .gte("completed_at", fromIso).lte("completed_at", toIso),
      supabaseAdmin.from("interview_token_usage")
        .select("session_id, session_type, audio_input_tokens, audio_output_tokens, total_cost_usd, duration_seconds, account_id, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso),
      supabaseAdmin.from("recruitment_usage_log")
        .select("account_id, credit_type, operation, amount, reference_id, reference_type, description, created_at")
        .eq("operation", "consume")
        .gte("created_at", fromIso).lte("created_at", toIso),
      supabaseAdmin.from("ai_execution_logs")
        .select("id, account_id, function_name, model, tokens_used, estimated_cost, status, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso),
      supabaseAdmin.from("platform_credit_config").select("*").limit(1).single(),
    ]);

    const tokenBySession = new Map<string, any>();
    (tokenUsage.data ?? []).forEach((t: any) => tokenBySession.set(t.session_id, t));

    // Index debits by reference window (per session: nearest debit within ±5min)
    const debits = usageLog.data ?? [];
    const interviewDebits = debits.filter((d: any) =>
      typeof d.reference_type === "string" && d.reference_type.includes("interview"));

    function findDebit(sessionTime: string, sessionType: "cultural" | "technical") {
      const targetMs = new Date(sessionTime).getTime();
      const wantedKey = sessionType === "cultural" ? "culture_interview" : "technical_interview";
      let best: any = null;
      let bestDelta = Infinity;
      for (const d of interviewDebits) {
        if (!d.reference_type?.startsWith(wantedKey)) continue;
        const delta = Math.abs(new Date(d.created_at).getTime() - targetMs);
        if (delta < bestDelta && delta < 10 * 60 * 1000) {
          bestDelta = delta;
          best = d;
        }
      }
      return best;
    }

    const interviewRows: any[] = [];

    function inspect(s: any, type: "cultural" | "technical") {
      const tok = tokenBySession.get(s.id);
      const debit = s.completed_at ? findDebit(s.completed_at, type) : null;
      const dur = s.duration_seconds ?? 0;
      // expected: 25 tok/s input ± 30%
      let tokenRatioOk: boolean | null = null;
      if (tok && dur > 5) {
        const expectedInput = dur * 25;
        const ratio = tok.audio_input_tokens / Math.max(1, expectedInput);
        tokenRatioOk = ratio >= 0.4 && ratio <= 2.5; // wider band; voice density varies
      }
      interviewRows.push({
        session_id: s.id,
        type,
        account_id: s.account_id,
        completed_at: s.completed_at,
        duration_seconds: dur,
        has_token_usage: !!tok,
        audio_input_tokens: tok?.audio_input_tokens ?? null,
        audio_output_tokens: tok?.audio_output_tokens ?? null,
        total_cost_usd: tok?.total_cost_usd ?? null,
        has_debit: !!debit,
        debit_amount: debit?.amount ?? null,
        debit_reference_type: debit?.reference_type ?? null,
        token_ratio_ok: tokenRatioOk,
      });
    }

    (cultureSess.data ?? []).forEach((s: any) => inspect(s, "cultural"));
    (techSess.data ?? []).forEach((s: any) => inspect(s, "technical"));

    // 2. AI execution coverage (R&S functions)
    const RS_PREFIXES = [
      "recruitment-", "hunting-", "candidate-", "careers-", "culture-interview-",
      "technical-interview-", "interview-", "send-disc-", "disc-", "send-interview-",
      "send-technical-", "send-rejection-", "send-talent-pool-", "screening-",
      "outreach-", "talent-", "offline-interview-",
    ];
    const aiExecRows = (aiLogs.data ?? [])
      .filter((l: any) => l.status === "success")
      .filter((l: any) => RS_PREFIXES.some((p) => l.function_name?.startsWith(p)))
      .map((l: any) => ({
        id: l.id,
        function_name: l.function_name,
        model: l.model,
        tokens_used: l.tokens_used,
        estimated_cost: l.estimated_cost,
        has_tokens: l.tokens_used != null && l.tokens_used > 0,
        created_at: l.created_at,
        account_id: l.account_id,
      }));

    // 3. Reconciliation
    const totalUsd = (tokenUsage.data ?? []).reduce((acc: number, t: any) => acc + Number(t.total_cost_usd ?? 0), 0);
    const totalInterviewCredits = interviewDebits.reduce((acc: number, d: any) => acc + Number(d.amount ?? 0), 0);
    const totalAllCredits = debits.reduce((acc: number, d: any) => acc + Number(d.amount ?? 0), 0);

    const usdToBrl = Number(creditConfig.data?.usd_to_brl ?? 5);
    const margin = Number(creditConfig.data?.margin_percent ?? 0) / 100;
    const creditValueBrl = Number(creditConfig.data?.credit_value_brl ?? 1);
    const expectedCreditsFromUsd = (totalUsd * usdToBrl * (1 + margin)) / creditValueBrl;

    // 4. Anomalies
    const anomalies: { severity: "high" | "medium"; message: string; ref?: string }[] = [];
    for (const r of interviewRows) {
      if (r.duration_seconds > 30 && !r.has_token_usage) {
        anomalies.push({ severity: "high", message: `Entrevista ${r.type} ${r.session_id} (${r.duration_seconds}s) SEM interview_token_usage`, ref: r.session_id });
      }
      if (r.duration_seconds > 30 && !r.has_debit) {
        anomalies.push({ severity: "high", message: `Entrevista ${r.type} ${r.session_id} SEM débito de crédito`, ref: r.session_id });
      }
      if (r.has_debit && r.has_token_usage && r.token_ratio_ok === false) {
        anomalies.push({ severity: "medium", message: `Entrevista ${r.session_id}: tokens fora da faixa (${r.audio_input_tokens} in / ${r.duration_seconds}s)`, ref: r.session_id });
      }
    }
    for (const r of aiExecRows) {
      if (!r.has_tokens) {
        anomalies.push({ severity: "medium", message: `${r.function_name} (${new Date(r.created_at).toLocaleString()}) sem tokens_used registrados`, ref: r.id });
      }
    }

    return new Response(JSON.stringify({
      window: { from: fromIso, to: toIso },
      summary: {
        interviews_total: interviewRows.length,
        interviews_with_token_usage: interviewRows.filter((r) => r.has_token_usage).length,
        interviews_with_debit: interviewRows.filter((r) => r.has_debit).length,
        ai_exec_total: aiExecRows.length,
        ai_exec_with_tokens: aiExecRows.filter((r) => r.has_tokens).length,
        total_cost_usd: Number(totalUsd.toFixed(4)),
        total_interview_credits_debited: Number(totalInterviewCredits.toFixed(2)),
        total_all_credits_debited: Number(totalAllCredits.toFixed(2)),
        expected_credits_from_usd: Number(expectedCreditsFromUsd.toFixed(2)),
        reconciliation_gap_pct: expectedCreditsFromUsd > 0
          ? Number((((totalInterviewCredits - expectedCreditsFromUsd) / expectedCreditsFromUsd) * 100).toFixed(1))
          : null,
        usd_to_brl: usdToBrl,
        margin_percent: margin * 100,
        credit_value_brl: creditValueBrl,
      },
      interviews: interviewRows.sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")),
      ai_executions: aiExecRows.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100),
      anomalies,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
