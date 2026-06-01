// Edge function: admin-financial-report
// Aggregates revenue, AI cost, and platform usage per account for Super Admin.
// Returns one payload with both P&L and Usage rows so the frontend can render
// the two-tab Financial Report page.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const USD_TO_BRL_FALLBACK = 5.65;

interface CompanyRow {
  id: string;
  name: string | null;
}

interface PnLRow {
  account_id: string;
  account_name: string;
  plan: string | null;
  revenue_brl: number;
  cost_brl: number;
  margin_brl: number;
  margin_pct: number | null;
  last_invoice_at: string | null;
}

interface UsageRow {
  account_id: string;
  account_name: string;
  cultural_interviews: number;
  technical_interviews: number;
  total_interviews: number;
  total_minutes: number;
  avg_minutes: number;
  completion_rate: number;
  active_jobs: number;
  candidates: number;
  credits_used_month: number;
  cost_brl: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- Auth: super admin only ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(
      token,
    );
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabaseAdmin.rpc("is_super_admin", {
      _user_id: userData.user.id,
    });
    if (isAdmin !== true) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Parse body ----
    const body = await req.json().catch(() => ({}));
    const days = Math.max(1, Math.min(365, Number(body.days) || 30));
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const accountIdsFilter: string[] | null = Array.isArray(body.account_ids) &&
        body.account_ids.length > 0
      ? body.account_ids
      : null;

    // ---- USD -> BRL rate ----
    const { data: cfg } = await supabaseAdmin
      .from("platform_credit_config")
      .select("usd_to_brl")
      .limit(1)
      .maybeSingle();
    const usdToBrl = Number((cfg as any)?.usd_to_brl) || USD_TO_BRL_FALLBACK;

    // ---- Companies ----
    let companiesQuery = supabaseAdmin
      .from("companies")
      .select("id, name");
    if (accountIdsFilter) {
      companiesQuery = companiesQuery.in("id", accountIdsFilter);
    }
    const { data: companiesData } = await companiesQuery;
    const companies = (companiesData as CompanyRow[]) || [];
    const companyMap = new Map<string, string>(
      companies.map((c) => [c.id, c.name || "Sem nome"]),
    );
    const accountIds = companies.map((c) => c.id);

    if (accountIds.length === 0) {
      return new Response(
        JSON.stringify({
          period_days: days,
          usd_to_brl: usdToBrl,
          totals: {
            revenue_brl: 0,
            cost_brl: 0,
            margin_brl: 0,
            margin_pct: 0,
            total_interviews: 0,
            total_minutes: 0,
            avg_minutes: 0,
          },
          pnl: [],
          usage: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ---- Parallel queries ----
    const [
      invoicesRes,
      aiLogsRes,
      cultureRes,
      techRes,
      appsRes,
      jobsRes,
      creditsRes,
      orgBillingRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("billing_invoices")
        .select("org_id, amount_paid, status, created_at")
        .in("org_id", accountIds)
        .eq("status", "paid")
        .gte("created_at", since),
      supabaseAdmin
        .from("ai_execution_logs")
        .select("account_id, estimated_cost")
        .in("account_id", accountIds)
        .gte("created_at", since)
        .eq("status", "success"),
      supabaseAdmin
        .from("culture_interview_sessions")
        .select("account_id, status, duration_seconds, is_test")
        .in("account_id", accountIds)
        .gte("created_at", since),
      supabaseAdmin
        .from("recruitment_interviews")
        .select("account_id, status, duration_seconds")
        .in("account_id", accountIds)
        .gte("created_at", since),
      supabaseAdmin
        .from("recruitment_applications")
        .select("account_id, id")
        .in("account_id", accountIds)
        .gte("created_at", since),
      supabaseAdmin
        .from("recruitment_jobs")
        .select("account_id, status")
        .in("account_id", accountIds),
      supabaseAdmin
        .from("recruitment_usage_credits")
        .select("account_id, monthly_used"),
      supabaseAdmin
        .from("org_billing")
        .select("org_id, status"),
    ]);

    const invoices = (invoicesRes.data as any[]) || [];
    const aiLogs = (aiLogsRes.data as any[]) || [];
    const cultureSessions = ((cultureRes.data as any[]) || []).filter(
      (s) => s.is_test !== true,
    );
    const techSessions = (techRes.data as any[]) || [];
    const apps = (appsRes.data as any[]) || [];
    const jobs = (jobsRes.data as any[]) || [];
    const credits = (creditsRes.data as any[]) || [];
    const orgBilling = (orgBillingRes.data as any[]) || [];

    // ---- Aggregations per account ----
    const planMap = new Map<string, string>(
      orgBilling.map((b) => [b.org_id, b.status]),
    );

    const revenueAgg = new Map<
      string,
      { revenue: number; last: string | null }
    >();
    for (const inv of invoices) {
      const prev = revenueAgg.get(inv.org_id) ||
        { revenue: 0, last: null as string | null };
      prev.revenue += Number(inv.amount_paid || 0) / 100; // cents -> BRL
      if (!prev.last || inv.created_at > prev.last) prev.last = inv.created_at;
      revenueAgg.set(inv.org_id, prev);
    }

    const costAgg = new Map<string, number>();
    for (const log of aiLogs) {
      const prev = costAgg.get(log.account_id) || 0;
      costAgg.set(
        log.account_id,
        prev + Number(log.estimated_cost || 0) * usdToBrl,
      );
    }

    const cultureAgg = new Map<
      string,
      { count: number; minutes: number; completed: number }
    >();
    for (const s of cultureSessions) {
      const prev = cultureAgg.get(s.account_id) ||
        { count: 0, minutes: 0, completed: 0 };
      prev.count += 1;
      prev.minutes += Number(s.duration_seconds || 0) / 60;
      if (s.status === "completed") prev.completed += 1;
      cultureAgg.set(s.account_id, prev);
    }

    const techAgg = new Map<
      string,
      { count: number; minutes: number; completed: number }
    >();
    for (const s of techSessions) {
      const prev = techAgg.get(s.account_id) ||
        { count: 0, minutes: 0, completed: 0 };
      prev.count += 1;
      prev.minutes += Number(s.duration_seconds || 0) / 60;
      if (s.status === "completed") prev.completed += 1;
      techAgg.set(s.account_id, prev);
    }

    const appsAgg = new Map<string, number>();
    for (const a of apps) {
      appsAgg.set(a.account_id, (appsAgg.get(a.account_id) || 0) + 1);
    }

    const activeJobsAgg = new Map<string, number>();
    for (const j of jobs) {
      if (j.status === "active" || j.status === "published") {
        activeJobsAgg.set(
          j.account_id,
          (activeJobsAgg.get(j.account_id) || 0) + 1,
        );
      }
    }

    const creditsAgg = new Map<string, number>();
    for (const c of credits) {
      creditsAgg.set(
        c.account_id,
        (creditsAgg.get(c.account_id) || 0) + Number(c.monthly_used || 0),
      );
    }

    // ---- Build rows ----
    const pnl: PnLRow[] = [];
    const usage: UsageRow[] = [];

    let totalsRevenue = 0;
    let totalsCost = 0;
    let totalsInterviews = 0;
    let totalsMinutes = 0;

    for (const acc of companies) {
      const name = acc.name || "Sem nome";
      const rev = revenueAgg.get(acc.id);
      const revenue = rev?.revenue || 0;
      const cost = costAgg.get(acc.id) || 0;
      const margin = revenue - cost;
      const marginPct = revenue > 0 ? (margin / revenue) * 100 : null;

      pnl.push({
        account_id: acc.id,
        account_name: name,
        plan: planMap.get(acc.id) || null,
        revenue_brl: revenue,
        cost_brl: cost,
        margin_brl: margin,
        margin_pct: marginPct,
        last_invoice_at: rev?.last || null,
      });

      const cult = cultureAgg.get(acc.id) ||
        { count: 0, minutes: 0, completed: 0 };
      const tech = techAgg.get(acc.id) ||
        { count: 0, minutes: 0, completed: 0 };
      const totalInt = cult.count + tech.count;
      const totalMin = cult.minutes + tech.minutes;
      const totalCompleted = cult.completed + tech.completed;

      usage.push({
        account_id: acc.id,
        account_name: name,
        cultural_interviews: cult.count,
        technical_interviews: tech.count,
        total_interviews: totalInt,
        total_minutes: Math.round(totalMin * 10) / 10,
        avg_minutes: totalInt > 0
          ? Math.round((totalMin / totalInt) * 10) / 10
          : 0,
        completion_rate: totalInt > 0
          ? Math.round((totalCompleted / totalInt) * 1000) / 10
          : 0,
        active_jobs: activeJobsAgg.get(acc.id) || 0,
        candidates: appsAgg.get(acc.id) || 0,
        credits_used_month: creditsAgg.get(acc.id) || 0,
        cost_brl: cost,
      });

      totalsRevenue += revenue;
      totalsCost += cost;
      totalsInterviews += totalInt;
      totalsMinutes += totalMin;
    }

    const totalsMargin = totalsRevenue - totalsCost;

    return new Response(
      JSON.stringify({
        period_days: days,
        usd_to_brl: usdToBrl,
        totals: {
          revenue_brl: totalsRevenue,
          cost_brl: totalsCost,
          margin_brl: totalsMargin,
          margin_pct: totalsRevenue > 0
            ? (totalsMargin / totalsRevenue) * 100
            : 0,
          total_interviews: totalsInterviews,
          total_minutes: Math.round(totalsMinutes * 10) / 10,
          avg_minutes: totalsInterviews > 0
            ? Math.round((totalsMinutes / totalsInterviews) * 10) / 10
            : 0,
        },
        pnl,
        usage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("admin-financial-report error", e);
    return new Response(
      JSON.stringify({ error: String((e as Error).message || e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
