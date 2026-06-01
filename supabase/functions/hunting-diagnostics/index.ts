// Diagnóstico do fluxo de Hunting & Outreach.
// Valida secrets, ICP de vagas, conexão WhatsApp e dados mínimos da conta.
// Retorna um relatório por fase (0..8) com status ok | warn | fail.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type CheckStatus = "ok" | "warn" | "fail";
interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "missing auth" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: "invalid token" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const accountId: string | undefined = body.account_id;
    if (!accountId) return json({ error: "account_id required" }, 400);

    const checks: Check[] = [];

    // Phase 0 — secrets
    const secretMap: Record<string, string | undefined> = {
      LOVABLE_API_KEY: Deno.env.get("LOVABLE_API_KEY"),
      FIRECRAWL_API_KEY: Deno.env.get("FIRECRAWL_API_KEY"),
      APOLLO_API_KEY: Deno.env.get("APOLLO_API_KEY"),
      APIFY_TOKEN: Deno.env.get("APIFY_TOKEN"),
      ZAPI_INSTANCE_ID: Deno.env.get("ZAPI_INSTANCE_ID"),
      ZAPI_TOKEN: Deno.env.get("ZAPI_TOKEN"),
    };
    for (const [name, value] of Object.entries(secretMap)) {
      const required = name === "LOVABLE_API_KEY" || name === "FIRECRAWL_API_KEY";
      checks.push({
        id: `secret:${name}`,
        label: `Secret ${name}`,
        status: value ? "ok" : required ? "fail" : "warn",
        detail: value ? "configurado" : required
          ? "obrigatório, ainda não configurado"
          : "opcional, recomendado para a fase correspondente",
      });
    }

    // Phase 1 — vagas publicadas com ICP
    const { data: jobs } = await admin
      .from("recruitment_jobs")
      .select("id, title, status")
      .eq("account_id", accountId)
      .eq("status", "published");

    const jobCount = jobs?.length ?? 0;
    checks.push({
      id: "jobs:published",
      label: "Vagas publicadas",
      status: jobCount > 0 ? "ok" : "fail",
      detail: `${jobCount} vaga(s) publicada(s)`,
    });

    let icpCount = 0;
    if (jobCount > 0) {
      const { data: icps } = await admin
        .from("job_icps")
        .select("id, job_id")
        .in("job_id", jobs!.map((j) => j.id));
      icpCount = icps?.length ?? 0;
    }
    checks.push({
      id: "jobs:icp",
      label: "ICP configurado",
      status: icpCount > 0 ? "ok" : jobCount > 0 ? "fail" : "warn",
      detail: `${icpCount}/${jobCount} vagas com ICP`,
    });

    // Phase 2-4 — buscas e resultados
    const { count: searchesCount } = await admin
      .from("recruitment_hunting_searches")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId);
    checks.push({
      id: "searches:any",
      label: "Buscas criadas",
      status: (searchesCount ?? 0) > 0 ? "ok" : "warn",
      detail: `${searchesCount ?? 0} busca(s)`,
    });

    const { data: searchIds } = await admin
      .from("recruitment_hunting_searches")
      .select("id")
      .eq("account_id", accountId);
    let importedCount = 0;
    if (searchIds && searchIds.length > 0) {
      const { count } = await admin
        .from("recruitment_hunting_results")
        .select("id", { count: "exact", head: true })
        .in("search_id", searchIds.map((s) => s.id))
        .eq("status", "imported");
      importedCount = count ?? 0;
    }
    checks.push({
      id: "results:imported",
      label: "Candidatos importados de hunting",
      status: importedCount > 0 ? "ok" : "warn",
      detail: `${importedCount} importado(s)`,
    });

    // Phase 6 — outreach
    const { count: approachesSent } = await admin
      .from("recruitment_hunting_approaches")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("status", "sent");
    checks.push({
      id: "outreach:sent",
      label: "Abordagens enviadas",
      status: (approachesSent ?? 0) > 0 ? "ok" : "fail",
      detail: `${approachesSent ?? 0} mensagem(ns) enviada(s)`,
    });

    const { count: approachesResp } = await admin
      .from("recruitment_hunting_approaches")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("status", "responded");
    checks.push({
      id: "outreach:responded",
      label: "Respostas recebidas",
      status: (approachesResp ?? 0) > 0 ? "ok" : "warn",
      detail: `${approachesResp ?? 0} resposta(s)`,
    });

    // Resumo
    const summary = {
      ok: checks.filter((c) => c.status === "ok").length,
      warn: checks.filter((c) => c.status === "warn").length,
      fail: checks.filter((c) => c.status === "fail").length,
    };

    return json({ success: true, summary, checks });
  } catch (err) {
    console.error("hunting-diagnostics error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
