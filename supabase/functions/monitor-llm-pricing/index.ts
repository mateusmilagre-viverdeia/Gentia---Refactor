// Weekly LLM pricing monitor.
// Scrapes official provider pricing pages via Firecrawl and compares vs. hardcoded rates.
// Any delta > 5% inserts an alert in `llm_pricing_alerts` and pings Discord.
// Prices are NEVER auto-updated in code — manual PR required for safety.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Hardcoded current rates (mirror of src/lib/pricingCalculator.ts + ai-credit-consumption.ts).
// USD per 1M tokens, or per minute for audio.
type ExpectedRate = { model: string; field: "input_usd_per_1m" | "output_usd_per_1m" | "audio_input_usd_per_1m" | "audio_output_usd_per_1m" | "usd_per_minute"; expected: number; source_url: string };

const EXPECTED: ExpectedRate[] = [
  // OpenAI text
  { model: "openai/gpt-5", field: "input_usd_per_1m", expected: 1.25, source_url: "https://openai.com/api/pricing/" },
  { model: "openai/gpt-5", field: "output_usd_per_1m", expected: 10.00, source_url: "https://openai.com/api/pricing/" },
  { model: "openai/gpt-5-mini", field: "input_usd_per_1m", expected: 0.25, source_url: "https://openai.com/api/pricing/" },
  { model: "openai/gpt-5-mini", field: "output_usd_per_1m", expected: 2.00, source_url: "https://openai.com/api/pricing/" },
  { model: "openai/gpt-5-nano", field: "input_usd_per_1m", expected: 0.05, source_url: "https://openai.com/api/pricing/" },
  { model: "openai/gpt-5-nano", field: "output_usd_per_1m", expected: 0.40, source_url: "https://openai.com/api/pricing/" },
  // OpenAI realtime
  { model: "openai/gpt-realtime-mini", field: "audio_input_usd_per_1m", expected: 10.00, source_url: "https://openai.com/api/pricing/" },
  { model: "openai/gpt-realtime-mini", field: "audio_output_usd_per_1m", expected: 20.00, source_url: "https://openai.com/api/pricing/" },
  // Google Gemini
  { model: "google/gemini-2.5-flash", field: "input_usd_per_1m", expected: 0.30, source_url: "https://ai.google.dev/gemini-api/docs/pricing" },
  { model: "google/gemini-2.5-flash", field: "output_usd_per_1m", expected: 2.50, source_url: "https://ai.google.dev/gemini-api/docs/pricing" },
  { model: "google/gemini-2.5-pro", field: "input_usd_per_1m", expected: 1.25, source_url: "https://ai.google.dev/gemini-api/docs/pricing" },
  { model: "google/gemini-2.5-pro", field: "output_usd_per_1m", expected: 10.00, source_url: "https://ai.google.dev/gemini-api/docs/pricing" },
  // Anthropic
  { model: "claude-sonnet-4-5", field: "input_usd_per_1m", expected: 3.00, source_url: "https://www.anthropic.com/pricing" },
  { model: "claude-sonnet-4-5", field: "output_usd_per_1m", expected: 15.00, source_url: "https://www.anthropic.com/pricing" },
];

const DELTA_THRESHOLD = 0.05; // 5%

async function firecrawlScrape(url: string): Promise<string> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) throw new Error("FIRECRAWL_API_KEY not set");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`firecrawl ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  return (json.markdown ?? json?.data?.markdown ?? "") as string;
}

/**
 * Extract a USD price near a model name + field keyword.
 * Very loose heuristic — prefers small numeric values that look like "$X.XX / 1M tokens".
 */
function extractPrice(md: string, modelName: string, fieldHint: "input" | "output" | "audio_input" | "audio_output"): number | null {
  if (!md) return null;
  const lower = md.toLowerCase();
  const idx = lower.indexOf(modelName.toLowerCase().split("/").pop()!);
  if (idx < 0) return null;
  const window = md.slice(Math.max(0, idx - 200), idx + 2000);
  // Find $X.XX patterns near input/output keyword
  const keyword = fieldHint.startsWith("audio") ? "audio" : fieldHint;
  const lines = window.split(/\n+/);
  for (const line of lines) {
    if (!line.toLowerCase().includes(keyword)) continue;
    const m = line.match(/\$\s*([\d]+(?:\.\d+)?)/);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

async function notifyDiscord(message: string) {
  const url = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message.slice(0, 1900) }),
    });
  } catch (e) {
    console.warn("Discord notify failed:", (e as Error).message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // CRON guard
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (expectedSecret && cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Group URLs to avoid duplicate scrapes
  const urlCache = new Map<string, string>();
  const alerts: { model: string; field: string; expected: number; detected: number; delta_pct: number; source_url: string; excerpt: string }[] = [];

  for (const row of EXPECTED) {
    try {
      let md = urlCache.get(row.source_url);
      if (!md) {
        md = await firecrawlScrape(row.source_url);
        urlCache.set(row.source_url, md);
      }
      const fieldHint = row.field.includes("audio_input")
        ? "audio_input"
        : row.field.includes("audio_output")
        ? "audio_output"
        : row.field.startsWith("input")
        ? "input"
        : "output";
      const detected = extractPrice(md, row.model, fieldHint as any);
      if (detected == null) continue;
      const delta = Math.abs(detected - row.expected) / row.expected;
      if (delta >= DELTA_THRESHOLD) {
        alerts.push({
          model: row.model,
          field: row.field,
          expected: row.expected,
          detected,
          delta_pct: delta * 100,
          source_url: row.source_url,
          excerpt: `Expected $${row.expected} → detected $${detected}`,
        });
      }
    } catch (e) {
      console.warn(`[monitor-llm-pricing] ${row.model}/${row.field}:`, (e as Error).message);
    }
  }

  // Persist alerts (skip duplicates of unacknowledged ones in last 7 days)
  for (const a of alerts) {
    const { data: existing } = await supabaseAdmin
      .from("llm_pricing_alerts")
      .select("id")
      .eq("model", a.model)
      .eq("field", a.field)
      .is("acknowledged_at", null)
      .gte("detected_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();
    if (existing) continue;
    await supabaseAdmin.from("llm_pricing_alerts").insert({
      model: a.model,
      field: a.field,
      current_value_usd: a.expected,
      detected_value_usd: a.detected,
      delta_pct: a.delta_pct,
      source_url: a.source_url,
      raw_excerpt: a.excerpt,
    });
  }

  if (alerts.length > 0) {
    const lines = alerts.map(a => `• **${a.model}** (${a.field}): $${a.expected} → $${a.detected.toFixed(4)} (Δ ${a.delta_pct.toFixed(1)}%)`).join("\n");
    await notifyDiscord(`🚨 **LLM Pricing Alert** — ${alerts.length} discrepância(s) detectada(s):\n${lines}\n\n_Revisar manualmente em src/lib/pricingCalculator.ts e supabase/functions/_shared/ai-credit-consumption.ts_`);
  }

  return new Response(
    JSON.stringify({ ok: true, checked: EXPECTED.length, alerts: alerts.length, details: alerts }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
