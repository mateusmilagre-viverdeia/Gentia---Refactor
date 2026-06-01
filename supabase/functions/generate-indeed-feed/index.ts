// Fase 7 — PR-G.2: generate-indeed-feed
// Gera o XML do feed Indeed para uma conta, salva no bucket público "indeed-feeds"
// e atualiza indeed_feed_config + indeed_submission_log.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_BASE_URL =
  Deno.env.get("PUBLIC_BASE_URL") || "https://gentia.tech";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function escapeCdata(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/]]>/g, "]]]]><![CDATA[>");
}
function cdata(value: unknown) {
  return `<![CDATA[${escapeCdata(value)}]]>`;
}

function slugify(input: string): string {
  return (input || "consultoria")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function parseLocation(loc: string | null | undefined): { city: string; state: string } {
  if (!loc) return { city: "", state: "" };
  const parts = loc.split(/[,/-]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { city: "", state: "" };
  if (parts.length === 1) return { city: parts[0], state: "" };
  const state = parts[parts.length - 1];
  const city = parts.slice(0, -1).join(", ");
  return { city, state: state.length <= 3 ? state.toUpperCase() : state };
}

function workModalityFor(job: any): string {
  const m = (job.work_modality || "").toLowerCase();
  if (m.includes("remot")) return "remoto";
  if (m.includes("hibri") || m.includes("hybr")) return "hibrido";
  if (m.includes("presen") || m.includes("onsite")) return "presencial";
  return "presencial";
}

function workModalityLabel(job: any): string {
  const m = (job.work_modality || "").toLowerCase();
  if (m.includes("remot")) return "Remoto";
  if (m.includes("hibri") || m.includes("hybr")) return "Híbrido";
  if (m.includes("presen") || m.includes("onsite")) return "Presencial";
  return "";
}

function buildFallbackDescription(job: any, company: string, url: string): string {
  const lines: string[] = [];
  if (job.title) lines.push(`Vaga: ${job.title}`);
  if (company) lines.push(`Empresa: ${company}`);
  if (job.location) lines.push(`Local: ${job.location}`);
  const modality = workModalityLabel(job);
  if (modality) lines.push(`Modelo de trabalho: ${modality}`);
  if (job.employment_type) lines.push(`Tipo de contrato: ${job.employment_type}`);
  if (job.department) lines.push(`Departamento: ${job.department}`);
  lines.push("");
  lines.push("Para se candidatar e ver mais detalhes da vaga, acesse:");
  lines.push(url);
  return lines.join("\n");
}

async function generateForAccount(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
) {
  // Skip demo accounts — never publish demo data on real public Indeed feed
  const { data: demoCfg } = await supabase
    .from('account_demo_config')
    .select('demo_mode_active')
    .eq('account_id', accountId)
    .maybeSingle();
  if ((demoCfg as any)?.demo_mode_active) {
    return {
      skipped: true,
      reason: 'account_in_demo_mode',
      account_id: accountId,
    };
  }

  // 1. Get/create config
  let { data: config } = await supabase
    .from("indeed_feed_config")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();

  // Resolve consultancy/company name
  const { data: company } = await supabase
    .from("companies")
    .select("name, slug, website")
    .eq("id", accountId)
    .maybeSingle();

  const consultancyName = company?.name || "GENTIA";
  const consultancyUrl = company?.website || PUBLIC_BASE_URL;

  if (!config) {
    const baseSlug = slugify(company?.slug || company?.name || `acc-${accountId.slice(0, 8)}`);
    let slug = baseSlug;
    let attempt = 0;
    while (attempt < 5) {
      const { data: clash } = await supabase
        .from("indeed_feed_config")
        .select("id")
        .eq("feed_slug", slug)
        .maybeSingle();
      if (!clash) break;
      attempt++;
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const feedUrl = `${SUPABASE_URL}/functions/v1/indeed-feed-public?slug=${slug}`;
    const inserted = await supabase
      .from("indeed_feed_config")
      .insert({
        account_id: accountId,
        feed_slug: slug,
        feed_url: feedUrl,
        is_active: true,
      })
      .select()
      .single();
    config = inserted.data as any;
  }

  if (!config) throw new Error("Failed to resolve indeed_feed_config");

  // 2. Open jobs
  const { data: jobs, error: jobsErr } = await supabase
    .from("recruitment_jobs")
    .select(
      "id, title, description, location, employment_type, work_modality, work_regime, budget_min, budget_max, hide_salary, status, published_at, created_at, additional_info, cliente_id, department",
    )
    .eq("account_id", accountId)
    .in("status", ["open", "active", "published"])
    .or("is_demo.is.null,is_demo.eq.false");

  if (jobsErr) throw jobsErr;

  const validJobs: string[] = [];
  const invalidJobs: Array<{ id: string; title: string; reason: string }> = [];
  const xmlJobs: string[] = [];

  // Resolve client names in batch
  const clienteIds = [...new Set((jobs || []).map((j: any) => j.cliente_id).filter(Boolean))];
  const clientNameMap: Record<string, string> = {};
  if (clienteIds.length > 0) {
    const { data: clientes } = await supabase
      .from("clientes_consultoria")
      .select("id, razao_social")
      .in("id", clienteIds);
    for (const c of clientes || []) {
      clientNameMap[(c as any).id] = (c as any).razao_social;
    }
  }

  for (const job of jobs || []) {
    const j: any = job;
    const company = clientNameMap[j.cliente_id] || consultancyName;
    const url = `${PUBLIC_BASE_URL}/careers/job/${j.id}`;
    const { city, state } = parseLocation(j.location);
    const rawDescription = (j.description || j.additional_info || "").trim();
    const description = rawDescription || buildFallbackDescription(j, company, url);

    const issues: string[] = [];
    if (!j.title?.trim()) issues.push("título ausente");
    if (!company.trim()) issues.push("empresa ausente");
    if (!city) issues.push("cidade ausente");

    if (issues.length > 0) {
      invalidJobs.push({ id: j.id, title: j.title || "(sem título)", reason: issues.join(", ") });
      continue;
    }

    validJobs.push(j.id);

    const salary =
      j.hide_salary || (!j.budget_min && !j.budget_max)
        ? ""
        : `${j.budget_min || ""}${j.budget_max ? `-${j.budget_max}` : ""} BRL`;

    xmlJobs.push(`  <job>
    <title>${cdata(j.title)}</title>
    <date>${new Date(j.published_at || j.created_at).toUTCString()}</date>
    <referencenumber>${j.id}</referencenumber>
    <url>${cdata(url)}</url>
    <company>${cdata(company)}</company>
    <sourcename>${cdata(consultancyName)}</sourcename>
    <city>${cdata(city)}</city>
    <state>${cdata(state)}</state>
    <country>BR</country>
    <description>${cdata(description)}</description>
    ${salary ? `<salary>${cdata(salary)}</salary>` : ""}
    ${j.employment_type ? `<jobtype>${cdata(j.employment_type)}</jobtype>` : ""}
    ${j.department ? `<category>${cdata(j.department)}</category>` : ""}
    <remotetype>${workModalityFor(j)}</remotetype>
  </job>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>${cdata(consultancyName)}</publisher>
  <publisherurl>${cdata(consultancyUrl)}</publisherurl>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${xmlJobs.join("\n")}
</source>`;

  const path = `${accountId}/indeed.xml`;
  const { error: upErr } = await supabase.storage
    .from("indeed-feeds")
    .upload(path, new Blob([xml], { type: "application/xml" }), {
      upsert: true,
      contentType: "application/xml",
    });
  if (upErr) throw upErr;

  const generatedAt = new Date().toISOString();
  await supabase
    .from("indeed_feed_config")
    .update({
      last_generated_at: generatedAt,
      total_jobs_in_feed: validJobs.length,
    })
    .eq("account_id", accountId);

  // Log entries
  if (validJobs.length > 0) {
    await supabase.from("indeed_submission_log").insert(
      validJobs.map((jid) => ({
        account_id: accountId,
        job_id: jid,
        action: "published",
        feed_generated_at: generatedAt,
        status: "success",
      })),
    );
  }
  if (invalidJobs.length > 0) {
    await supabase.from("indeed_submission_log").insert(
      invalidJobs.map((j) => ({
        account_id: accountId,
        job_id: j.id,
        action: "skipped",
        feed_generated_at: generatedAt,
        status: "error",
        error_message: j.reason,
      })),
    );
    // notify
    try {
      await supabase.from("notifications").insert(
        invalidJobs.slice(0, 5).map((j) => ({
          account_id: accountId,
          title: "Vaga não incluída no feed do Indeed",
          message: `A vaga "${j.title}" não foi incluída. Motivo: ${j.reason}.`,
          type: "warning",
        })),
      );
    } catch (_) {}
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/indeed-feeds/${path}`;
  return {
    feed_url: config.feed_url,
    public_xml_url: publicUrl,
    total_jobs: validJobs.length,
    invalid_jobs: invalidJobs.length,
    feed_slug: config.feed_slug,
    generated_at: generatedAt,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));

    // Cron mode: regenerate all active feeds
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret && cronSecret === Deno.env.get("CRON_SECRET")) {
      const { data: configs } = await supabase
        .from("indeed_feed_config")
        .select("account_id")
        .eq("is_active", true);
      const results: any[] = [];
      for (const c of configs || []) {
        try {
          results.push(await generateForAccount(supabase, (c as any).account_id));
        } catch (e) {
          results.push({ account_id: (c as any).account_id, error: String(e) });
        }
      }
      return json(200, { mode: "cron", count: results.length, results });
    }

    if (!body?.account_id) return json(400, { error: "account_id required" });
    const result = await generateForAccount(supabase, body.account_id);
    return json(200, result);
  } catch (e) {
    console.error("generate-indeed-feed error", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown" });
  }
});
