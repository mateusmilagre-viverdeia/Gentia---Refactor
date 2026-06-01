// Calcula saúde de contas (visão Super Admin) — 6 indicadores ponderados
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Pesos dos indicadores (somam 100)
const WEIGHTS = {
  usage: 20,
  adoption: 20,
  engagement: 15,
  ai_consumption: 15,
  billing: 20,
  nps: 10,
};

type Scores = {
  usage_score: number;
  adoption_score: number;
  engagement_score: number;
  ai_consumption_score: number;
  billing_score: number;
  nps_score: number;
};

function clamp(n: number) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function statusFromScore(score: number): "green" | "yellow" | "red" {
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

async function calculateForAccount(admin: any, accountId: string) {
  const detail: Record<string, any> = {};
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Frequência de uso — membros com last_access_at nos últimos 30d / total
  const { data: members } = await admin
    .from("account_members")
    .select("user_id, is_active, last_access_at")
    .eq("account_id", accountId);

  const totalMembers = members?.length ?? 0;
  const activeMembers = (members ?? []).filter(
    (m: any) => m.is_active !== false,
  ).length;
  const recentlyActive = (members ?? []).filter(
    (m: any) => m.last_access_at && m.last_access_at >= since30,
  ).length;

  const usage_score = totalMembers
    ? clamp((recentlyActive / totalMembers) * 100)
    : 50;
  detail.usage = {
    total_members: totalMembers,
    active_members: activeMembers,
    recently_active_30d: recentlyActive,
  };

  // 3. Engajamento — % membros ativos sobre total
  const engagement_score = totalMembers
    ? clamp((activeMembers / totalMembers) * 100)
    : 50;
  detail.engagement = {
    active_members: activeMembers,
    total_members: totalMembers,
  };

  // 2. Adoção de módulos — módulos com atividade real (proxy via ai_execution_logs por function_name) / módulos licenciados
  const { data: licensed } = await admin
    .from("account_licensed_modules")
    .select("module_slug")
    .eq("account_id", accountId);
  const licensedSlugs = new Set(
    (licensed ?? []).map((m: any) => m.module_slug),
  );
  const totalLicensed = licensedSlugs.size;

  const { data: aiLogs30d } = await admin
    .from("ai_execution_logs")
    .select("function_name, tokens_used, estimated_cost, created_at")
    .eq("account_id", accountId)
    .gte("created_at", since30);

  const usedFunctions = new Set(
    (aiLogs30d ?? []).map((l: any) => l.function_name),
  );
  // Heurística simples: se há logs de IA, conta como módulo usado
  const modulesWithActivity = Math.min(totalLicensed, usedFunctions.size);

  const adoption_score = totalLicensed
    ? clamp((modulesWithActivity / totalLicensed) * 100)
    : 50;
  detail.adoption = {
    licensed_modules: totalLicensed,
    modules_with_activity_30d: modulesWithActivity,
  };

  // 4. Consumo de IA — uso saudável (não estagnado, não estourado)
  const totalTokens = (aiLogs30d ?? []).reduce(
    (s: number, l: any) => s + (l.tokens_used ?? 0),
    0,
  );
  const totalCost = (aiLogs30d ?? []).reduce(
    (s: number, l: any) => s + Number(l.estimated_cost ?? 0),
    0,
  );

  // Score: 100 se há atividade saudável (>0 e < limite alto), 30 se zero, 50 se muito alto
  let ai_consumption_score = 50;
  if (totalTokens === 0) ai_consumption_score = 30;
  else if (totalTokens > 0 && totalTokens < 500_000) ai_consumption_score = 100;
  else if (totalTokens >= 500_000 && totalTokens < 2_000_000)
    ai_consumption_score = 75;
  else ai_consumption_score = 50;

  detail.ai_consumption = {
    total_tokens_30d: totalTokens,
    estimated_cost_30d: Number(totalCost.toFixed(2)),
    executions_30d: aiLogs30d?.length ?? 0,
  };

  // 5. Pagamento em dia — invoices não pagas/vencidas (org_id == account_id na maioria dos casos)
  const { data: invoices } = await admin
    .from("billing_invoices")
    .select("status, amount_due, amount_paid, period_end")
    .eq("org_id", accountId);

  const totalInvoices = invoices?.length ?? 0;
  const overdueInvoices = (invoices ?? []).filter(
    (i: any) =>
      i.status &&
      ["open", "uncollectible", "past_due"].includes(i.status) &&
      i.amount_due > (i.amount_paid ?? 0),
  ).length;

  let billing_score = 100;
  if (totalInvoices === 0) {
    billing_score = 70; // sem histórico de billing — neutro-positivo
  } else if (overdueInvoices === 0) {
    billing_score = 100;
  } else {
    billing_score = clamp(100 - (overdueInvoices / totalInvoices) * 100);
  }
  detail.billing = {
    total_invoices: totalInvoices,
    overdue_invoices: overdueInvoices,
  };

  // 6. NPS — fallback neutro 50 (sem tabela NPS dedicada confirmada; fica reservado)
  const nps_score = 50;
  detail.nps = { source: "neutral_fallback", value: 50 };

  const scores: Scores = {
    usage_score,
    adoption_score,
    engagement_score,
    ai_consumption_score,
    billing_score,
    nps_score,
  };

  const overall_score = clamp(
    (scores.usage_score * WEIGHTS.usage +
      scores.adoption_score * WEIGHTS.adoption +
      scores.engagement_score * WEIGHTS.engagement +
      scores.ai_consumption_score * WEIGHTS.ai_consumption +
      scores.billing_score * WEIGHTS.billing +
      scores.nps_score * WEIGHTS.nps) /
      100,
  );

  const health_status = statusFromScore(overall_score);
  const calculated_at = new Date().toISOString();

  const { data: upserted, error: upsertErr } = await admin
    .from("account_health_scores")
    .upsert(
      {
        account_id: accountId,
        ...scores,
        overall_score,
        health_status,
        indicators_detail: detail,
        calculated_at,
      },
      { onConflict: "account_id" },
    )
    .select()
    .single();

  if (upsertErr) throw upsertErr;
  return upserted;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const admin = createClient(supabaseUrl, serviceKey);

    // Validar que é super_admin
    const { data: isSuper, error: roleErr } = await admin.rpc(
      "is_super_admin",
      { _user_id: userId },
    );
    if (roleErr || !isSuper) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { account_id, all } = body as {
      account_id?: string;
      all?: boolean;
    };

    if (all) {
      const { data: companies, error: cErr } = await admin
        .from("companies")
        .select("id");
      if (cErr) throw cErr;

      const results: any[] = [];
      const errors: any[] = [];
      const batch = 20;
      for (let i = 0; i < (companies ?? []).length; i += batch) {
        const slice = (companies ?? []).slice(i, i + batch);
        const settled = await Promise.allSettled(
          slice.map((c: any) => calculateForAccount(admin, c.id)),
        );
        for (const [idx, s] of settled.entries()) {
          if (s.status === "fulfilled") results.push(s.value);
          else errors.push({ account_id: slice[idx].id, error: String(s.reason) });
        }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          processed: results.length,
          failed: errors.length,
          errors,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!account_id) {
      return new Response(
        JSON.stringify({ error: "account_id ou all=true é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const result = await calculateForAccount(admin, account_id);
    return new Response(JSON.stringify({ ok: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("calculate-account-health error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
