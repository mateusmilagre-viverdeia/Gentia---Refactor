import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { callClaudeWithTool } from "../_shared/anthropic-client.ts";
import { perplexitySearch, firecrawlScrape } from "../_shared/perplexity-client.ts";
import { consumeAICredits } from "../_shared/ai-credit-consumption.ts";

const PayloadSchema = z.object({
  account_id: z.string().uuid({ message: "account_id must be a valid UUID" }),
  client_account_id: z.string().uuid().nullable().optional(),
  job_title: z.string().trim().min(2).max(120),
  seniority: z.string().trim().min(2).max(40),
  area: z.string().trim().max(80).optional().nullable(),
  industry: z.string().trim().max(80).optional().nullable(),
  location: z.object({
    city: z.string().trim().max(80).optional(),
    state: z.string().trim().max(80).optional(),
    country: z.string().trim().max(80).optional(),
    work_model: z.string().trim().max(40).optional(),
  }).default({}),
  competitors: z.array(z.string().trim().max(120)).max(20).optional().default([]),
  reference_urls: z.array(z.string().url().max(500)).max(5).optional().default([]),
  required_skills: z.array(z.string().trim().max(80)).max(30).optional().default([]),
  briefing_notes: z.string().trim().max(4000).optional().nullable(),
  branding: z.object({
    logo_url: z.string().url().max(500).optional(),
    primary_color: z.string().regex(/^#?[0-9a-fA-F]{3,8}$/).optional(),
    consultancy_name: z.string().trim().max(120).optional(),
    client_name: z.string().trim().max(120).optional(),
  }).optional().default({}),
});

function mapUpstreamError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/\b402\b|insufficient|payment required|insufficient_quota|credit/i.test(msg)) {
    return { status: 402, message: "A IA premium (Claude/Perplexity) está sem créditos. Adicione saldo no provedor e tente novamente." };
  }
  if (/\b429\b|rate limit|too many requests/i.test(msg)) {
    return { status: 429, message: "Limite de requisições da IA atingido. Aguarde alguns minutos e tente novamente." };
  }
  return { status: 500, message: msg };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = "direct"!;

// Saldo mínimo exigido antes de iniciar a geração.
// Cobrança real é dinâmica (por tokens consumidos); este valor é só um guard
// para evitar que o usuário rode 5min de pipeline e descubra no fim que
// estava sem créditos.
const MIN_CREDITS_REQUIRED = 20;

interface CreatePayload {
  account_id: string;
  client_account_id?: string | null;
  job_title: string;
  seniority: string;
  area?: string;
  industry?: string;
  location: { city?: string; state?: string; country?: string; work_model?: string };
  competitors?: string[];
  reference_urls?: string[];
  required_skills?: string[];
  briefing_notes?: string;
  branding?: { logo_url?: string; primary_color?: string; consultancy_name?: string; client_name?: string };
}

async function callLovableAI(model: string, system: string, user: string, maxTokens = 1500) {
  const res = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Lovable AI ${model} failed [${res.status}]: ${t}`);
  }
  return await res.json();
}

function locationLabel(loc: any) {
  const parts = [loc?.city, loc?.state, loc?.country].filter(Boolean);
  return parts.join(", ") || "Brasil";
}

function genSlug() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);
  let reportId: string | null = null;
  let accountId: string | null = null;

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    const rawPayload = await req.json().catch(() => null);
    const parsed = PayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const payload = parsed.data as CreatePayload;
    accountId = payload.account_id;

    // Verify membership
    const { data: membership } = await supabaseAdmin.rpc("is_account_member", {
      _user_id: userId, _account_id: accountId,
    });
    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member of this account" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Guard de saldo: bloqueia se < MIN_CREDITS_REQUIRED créditos universais
    const { data: balanceRow } = await supabaseAdmin
      .from("recruitment_usage_credits")
      .select("balance")
      .eq("account_id", accountId)
      .eq("credit_type", "universal")
      .maybeSingle();
    const currentBalance = Number(balanceRow?.balance ?? 0);
    if (currentBalance < MIN_CREDITS_REQUIRED) {
      return new Response(
        JSON.stringify({
          error: `Saldo insuficiente para gerar a pesquisa. São necessários pelo menos ${MIN_CREDITS_REQUIRED} créditos. Saldo atual: ${currentBalance.toFixed(1)}.`,
          code: "INSUFFICIENT_CREDITS",
          required: MIN_CREDITS_REQUIRED,
          available: currentBalance,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert draft report
    const slug = genSlug();
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("market_research_reports")
      .insert({
        account_id: accountId,
        client_account_id: payload.client_account_id || null,
        created_by: userId,
        job_title: payload.job_title,
        seniority: payload.seniority,
        area: payload.area || null,
        industry: payload.industry || null,
        location: payload.location,
        competitors: payload.competitors || [],
        reference_urls: payload.reference_urls || [],
        required_skills: payload.required_skills || [],
        briefing_notes: payload.briefing_notes || null,
        branding: payload.branding || {},
        status: "generating",
        public_slug: slug,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        generation_started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insErr || !inserted) throw new Error(`Insert failed: ${insErr?.message}`);
    reportId = inserted.id;

    // Fire and forget pipeline (don't await — return id immediately)
    runPipeline({
      supabaseAdmin, reportId, payload, userId, accountId,
    }).catch(async (err) => {
      console.error("[pipeline] failed:", err);
      const mapped = mapUpstreamError(err);
      await supabaseAdmin
        .from("market_research_reports")
        .update({
          status: "failed",
          error_message: mapped.message,
          generation_completed_at: new Date().toISOString(),
        })
        .eq("id", reportId);
    });

    return new Response(
      JSON.stringify({ id: reportId, slug, status: "generating" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[generate-market-research] error:", err);
    const mapped = mapUpstreamError(err);
    if (reportId) {
      await supabaseAdmin
        .from("market_research_reports")
        .update({
          status: "failed",
          error_message: mapped.message,
          generation_completed_at: new Date().toISOString(),
        })
        .eq("id", reportId);
    }
    return new Response(
      JSON.stringify({ error: mapped.message }),
      { status: mapped.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function runPipeline(args: {
  supabaseAdmin: any;
  reportId: string;
  payload: CreatePayload;
  userId: string;
  accountId: string;
}) {
  const { supabaseAdmin, reportId, payload, userId, accountId } = args;
  const aiExecutions: any[] = [];

  // 1) Internal data (vagas e benchmarks similares)
  const [{ data: similarJobs }] = await Promise.all([
    supabaseAdmin
      .from("recruitment_jobs")
      .select("id, title, seniority, work_model, salary_min, salary_max, location")
      .eq("account_id", accountId)
      .ilike("title", `%${payload.job_title.split(" ")[0]}%`)
      .limit(10),
  ]);

  // 2) Web research via Perplexity (4 queries)
  const loc = locationLabel(payload.location);
  const role = `${payload.job_title} ${payload.seniority}`;
  const ind = payload.industry ? ` no setor ${payload.industry}` : "";
  const queries = [
    `Faixa salarial detalhada (mínimo, mediana, máximo, percentis 25 e 75) CLT e PJ para ${role}${ind} em ${loc} no Brasil em 2025/2026. Inclua benefícios típicos.`,
    `Tamanho do pool de candidatos, escassez, tempo médio de fechamento e modelos de trabalho (remoto/híbrido/presencial) para ${role}${ind} em ${loc} em 2025.`,
    `Quais empresas estão contratando ${role}${ind} em ${loc}? EVP, posicionamento, rodadas de investimento e movimentos relevantes em 2025.`,
    `Tendências de mercado, skills emergentes e em declínio, e perspectiva 12-24 meses para ${role}${ind} no Brasil.`,
  ];
  const domains = ["glassdoor.com.br", "linkedin.com", "vagas.com.br", "catho.com.br", "lovemondays.com.br", "robertwalters.com.br", "michaelpage.com.br", "hays.com.br"];
  const perplexityResults: { query: string; content: string; citations: string[] }[] = [];
  for (const q of queries) {
    try {
      const r = await perplexitySearch({ query: q, recency: "year", domainFilter: domains });
      perplexityResults.push({ query: q, content: r.content, citations: r.citations });
      aiExecutions.push({ block: "perplexity", model: r.model, ...r.usage });
    } catch (e) {
      console.warn("[perplexity] error:", e);
    }
  }

  // 3) Firecrawl scrapes (up to 5 reference URLs)
  const scrapes: { url: string; markdown: string; title?: string }[] = [];
  const urls = (payload.reference_urls || []).slice(0, 5);
  for (const url of urls) {
    const r = await firecrawlScrape(url);
    if (r) scrapes.push({ url, ...r });
  }

  // Build citations index
  const citations: { index: number; url: string; query?: string }[] = [];
  perplexityResults.forEach((p) => {
    p.citations.forEach((url) => {
      if (!citations.find((c) => c.url === url)) {
        citations.push({ index: citations.length + 1, url, query: p.query });
      }
    });
  });
  scrapes.forEach((s) => {
    if (!citations.find((c) => c.url === s.url)) {
      citations.push({ index: citations.length + 1, url: s.url, query: "scrape" });
    }
  });

  // 4) Load model config + prompts
  const { data: modelConfigs } = await supabaseAdmin.from("market_research_model_config").select("*");
  const { data: prompts } = await supabaseAdmin
    .from("market_research_prompts")
    .select("*")
    .eq("is_active", true);

  const cfgFor = (name: string) => modelConfigs?.find((c: any) => c.block_name === name);
  const promptFor = (name: string) => prompts?.find((p: any) => p.block_name === name);

  // Build context block (shared)
  const context = [
    `## BRIEFING\nCargo: ${payload.job_title}\nSenioridade: ${payload.seniority}\nÁrea: ${payload.area || "—"}\nSetor: ${payload.industry || "—"}\nLocalização: ${loc} (${payload.location.work_model || "presencial"})\nSkills-chave: ${(payload.required_skills || []).join(", ") || "—"}\nConcorrentes informados: ${(payload.competitors || []).join(", ") || "—"}\nObservações: ${payload.briefing_notes || "—"}`,
    `## DADOS INTERNOS (vagas similares na base do cliente)\n${JSON.stringify(similarJobs || [], null, 2).slice(0, 3000)}`,
    `## WEB SOURCES (Perplexity grounded)\n${perplexityResults.map((p, i) => `### Query ${i + 1}: ${p.query}\n${p.content}\nFontes: ${p.citations.join(" | ")}`).join("\n\n")}`,
    `## SCRAPES (vagas concorrentes)\n${scrapes.map((s) => `URL: ${s.url}\n${s.markdown.slice(0, 4000)}`).join("\n\n---\n\n") || "(nenhum scrape disponível)"}`,
    `## CITATIONS DISPONÍVEIS (use os índices)\n${citations.map((c) => `[${c.index}] ${c.url}`).join("\n")}`,
  ].join("\n\n");

  // Helper: run a Claude block
  async function runClaudeBlock(blockName: string, extraContext = "") {
    const cfg = cfgFor(blockName);
    const prompt = promptFor(blockName);
    if (!cfg || !prompt) throw new Error(`Missing config/prompt for ${blockName}`);
    const tool = prompt.tool_schema;
    const result = await callClaudeWithTool({
      model: cfg.model_id,
      systemPrompt: prompt.system_prompt,
      userMessage: context + (extraContext ? `\n\n${extraContext}` : ""),
      tool,
      maxTokens: cfg.max_tokens,
      temperature: Number(cfg.temperature),
    });
    aiExecutions.push({
      block: blockName,
      model: result.model,
      prompt_version: prompt.version,
      ...result.usage,
    });
    const data = result.toolCalls[0]?.input || {};
    return data;
  }

  // 5) Run blocks 1-3 in parallel (Sonnet)
  const [compensation, talent, competitive] = await Promise.all([
    runClaudeBlock("compensation"),
    runClaudeBlock("talent_intelligence"),
    runClaudeBlock("competitive"),
  ]);

  // 6) Block 4: Diagnosis (Opus) with context of others
  const diagnosis = await runClaudeBlock(
    "diagnosis",
    `## BLOCOS ANTERIORES\n### Remuneração\n${JSON.stringify(compensation).slice(0, 4000)}\n### Talentos\n${JSON.stringify(talent).slice(0, 3000)}\n### Competitivo\n${JSON.stringify(competitive).slice(0, 3000)}`
  );

  // 7) Executive summary (Gemini Flash)
  const sumCfg = cfgFor("executive_summary");
  const sumModel = sumCfg?.model_id || "google/gemini-2.5-flash";
  const sumRes = await callLovableAI(
    sumModel,
    "Você é um redator executivo de consultoria premium. Produza JSON.",
    `Com base nos blocos abaixo, gere um sumário executivo em 5 bullets curtos (máx 25 palavras cada), em português brasileiro corporativo. Responda APENAS um JSON: {"bullets":[...], "headline":"frase de impacto em 12 palavras"}.\n\nRemuneração: ${JSON.stringify(compensation).slice(0, 2500)}\nTalentos: ${JSON.stringify(talent).slice(0, 2000)}\nCompetitivo: ${JSON.stringify(competitive).slice(0, 2000)}\nDiagnóstico: ${JSON.stringify(diagnosis).slice(0, 2500)}`,
    1200
  );
  aiExecutions.push({ block: "executive_summary", model: sumModel, prompt_tokens: sumRes.usage?.prompt_tokens || 0, completion_tokens: sumRes.usage?.completion_tokens || 0 });
  let executiveSummary: any = { bullets: [], headline: "" };
  try {
    const txt = sumRes.choices?.[0]?.message?.content || "{}";
    const jsonMatch = txt.match(/\{[\s\S]*\}/);
    executiveSummary = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
  } catch { /* keep empty */ }

  // 8) Persist final + debit credits (sum all executions)
  let totalIn = 0, totalOut = 0;
  for (const e of aiExecutions) {
    totalIn += e.prompt_tokens || 0;
    totalOut += e.completion_tokens || 0;
  }

  // Debit per provider/model (proportional). Simpler: charge each execution.
  let totalCredits = 0;
  for (const e of aiExecutions) {
    const debit = await consumeAICredits({
      supabase: supabaseAdmin,
      accountId,
      aiData: { usage: { prompt_tokens: e.prompt_tokens, completion_tokens: e.completion_tokens } },
      model: e.model || "google/gemini-2.5-flash",
      referenceId: reportId,
      referenceType: "market_research",
      description: `Pesquisa de Mercado - ${e.block}`,
      userId,
    });
    totalCredits += debit.creditsConsumed || 0;
  }

  await supabaseAdmin
    .from("market_research_reports")
    .update({
      status: "ready",
      executive_summary: executiveSummary,
      compensation_block: compensation,
      talent_intelligence_block: talent,
      competitive_block: competitive,
      diagnosis_block: diagnosis,
      citations,
      models_used: aiExecutions.reduce((acc: any, e: any) => {
        acc[e.block] = e.model;
        return acc;
      }, {}),
      ai_executions: aiExecutions,
      credits_consumed: totalCredits,
      generation_completed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  // Log estruturado para calibração futura de pricing
  console.log("[market-research] completed", JSON.stringify({
    report_id: reportId,
    account_id: accountId,
    total_credits: Number(totalCredits.toFixed(2)),
    total_tokens_in: totalIn,
    total_tokens_out: totalOut,
    blocks: aiExecutions.length,
    models_used: Array.from(new Set(aiExecutions.map((e) => e.model))),
  }));
}
