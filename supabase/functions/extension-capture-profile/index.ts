// Fase 7 — PR-F.2: extension-capture-profile
// Recebe um perfil capturado pela extensão Chrome, deduplica, estrutura via LLM,
// cria candidato (e application se job_id informado) e dispara cross-match.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { consumeAICredits } from "../_shared/ai-credit-consumption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = "direct";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface CaptureBody {
  account_id: string;
  captured_by?: string;
  job_id?: string | null;
  profile_data: {
    name?: string;
    headline?: string;
    location?: string;
    about?: string;
    current_role?: string;
    current_company?: string;
    profile_url: string;
    photo_url?: string;
    connections?: string;
    experience?: Array<Record<string, unknown>>;
    education?: Array<Record<string, unknown>>;
    skills?: string[];
  };
}

async function structureWithLLM(profile: CaptureBody["profile_data"], supabase: any, accountId: string) {
  if (!LOVABLE_API_KEY) return null;
  try {
    const resp = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Você estrutura perfis profissionais do LinkedIn. Sempre use a tool `structure_profile`.",
          },
          {
            role: "user",
            content: `Estruture o perfil abaixo:\n${JSON.stringify(profile, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "structure_profile",
              description: "Retorna o perfil estruturado",
              parameters: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  cargo_atual: { type: "string" },
                  empresa_atual: { type: "string" },
                  cidade: { type: "string" },
                  estado: { type: "string" },
                  senioridade: {
                    type: "string",
                    enum: ["junior", "mid", "senior", "manager", "director"],
                  },
                  resumo: { type: "string" },
                  competencias: { type: "array", items: { type: "string" } },
                  setores: { type: "array", items: { type: "string" } },
                  historico: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cargo: { type: "string" },
                        empresa: { type: "string" },
                        periodo_inicio: { type: "string" },
                        periodo_fim: { type: "string" },
                      },
                    },
                  },
                },
                required: ["nome", "cargo_atual", "competencias"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "structure_profile" } },
      }),
    });
    if (!resp.ok) {
      console.error("LLM error", resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    await consumeAICredits({
      supabase, accountId, aiData: data, model: 'google/gemini-3-flash-preview',
      referenceType: 'extension_capture_profile',
      description: `Estruturação perfil ${profile.profile_url}`,
    });
    const args =
      data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    return JSON.parse(args);
  } catch (e) {
    console.error("LLM exception", e);
    return null;
  }
}

function splitName(full: string): { first: string; last: string } {
  const parts = (full || "").trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: "Invalid token" });
    const userId = userData.user.id;

    const body: CaptureBody = await req.json();
    if (!body?.account_id || !body?.profile_data?.profile_url) {
      return json(400, { error: "account_id and profile_data.profile_url are required" });
    }

    const profile = body.profile_data;
    const captured_by = body.captured_by || userId;

    // Detect demo mode for this account
    const { data: demoCfg } = await supabaseAdmin
      .from('account_demo_config')
      .select('demo_mode_active')
      .eq('account_id', body.account_id)
      .maybeSingle();
    const isDemo = Boolean((demoCfg as any)?.demo_mode_active);

    // 1. Insert pending capture
    const { data: capture, error: capErr } = await supabaseAdmin
      .from("chrome_extension_captures")
      .insert({
        account_id: body.account_id,
        captured_by,
        source_url: profile.profile_url,
        raw_data: profile as any,
        job_id: body.job_id || null,
        processing_status: "pending",
        is_demo: isDemo,
      })
      .select()
      .single();

    if (capErr || !capture) {
      console.error("Insert capture error", capErr);
      return json(500, { error: "Failed to register capture" });
    }

    // 2. Deduplicate by linkedin_url
    const { data: existing } = await supabaseAdmin
      .from("recruitment_candidates")
      .select("id, first_name, last_name, created_at")
      .eq("account_id", body.account_id)
      .eq("linkedin_url", profile.profile_url)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("chrome_extension_captures")
        .update({
          processing_status: "duplicate",
          candidate_id: existing.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", capture.id);

      return json(200, {
        candidate_id: existing.id,
        is_duplicate: true,
        candidate_name: `${existing.first_name ?? ""} ${existing.last_name ?? ""}`.trim(),
        candidate_created_at: existing.created_at,
        candidate_url: `/recruitment/candidates/${existing.id}`,
      });
    }

    // 3. Structure with LLM
    await supabaseAdmin
      .from("chrome_extension_captures")
      .update({ processing_status: "processing" })
      .eq("id", capture.id);

    const structured = await structureWithLLM(profile, supabaseAdmin, body.account_id);

    const fullName = structured?.nome || profile.name || "Candidato sem nome";
    const { first, last } = splitName(fullName);
    const cargo = structured?.cargo_atual || profile.current_role || profile.headline || null;
    const empresa = structured?.empresa_atual || profile.current_company || null;
    const competencias: string[] = Array.isArray(structured?.competencias)
      ? structured.competencias.slice(0, 15)
      : profile.skills?.slice(0, 15) || [];

    // 4. Create candidate (LinkedIn não expõe e-mail; geramos placeholder estável)
    const slug = (profile.profile_url || "")
      .replace(/\/+$/, "")
      .split("/")
      .pop()
      ?.split("?")[0] || crypto.randomUUID();
    const placeholderEmail = `linkedin+${slug}@gentia.placeholder`;

    const { data: candidate, error: candErr } = await supabaseAdmin
      .from("recruitment_candidates")
      .insert({
        account_id: body.account_id,
        first_name: first,
        last_name: last,
        email: placeholderEmail,
        linkedin_url: profile.profile_url,
        avatar_url: profile.photo_url || null,
        source: "chrome_extension",
        stage: "lead",
        status: "new",
        tags: competencias,
        notes: structured?.resumo || profile.about || null,
        first_touch_source: "chrome_extension",
        first_touch_medium: "linkedin",
        last_touch_source: "chrome_extension",
        last_touch_medium: "linkedin",
        first_touch_at: new Date().toISOString(),
        last_touch_at: new Date().toISOString(),
        is_demo: isDemo,
      })
      .select()
      .single();

    if (candErr || !candidate) {
      console.error("Create candidate error", candErr);
      await supabaseAdmin
        .from("chrome_extension_captures")
        .update({
          processing_status: "error",
          error_message: candErr?.message || "Failed to create candidate",
          processed_at: new Date().toISOString(),
        })
        .eq("id", capture.id);
      return json(500, { error: "Failed to create candidate" });
    }

    // 5. Work history (best-effort)
    try {
      if (Array.isArray(structured?.historico) && structured.historico.length > 0) {
        const rows = structured.historico.slice(0, 10).map((h: any) => ({
          candidate_id: candidate.id,
          account_id: body.account_id,
          position: h.cargo || null,
          company: h.empresa || null,
          start_date: h.periodo_inicio || null,
          end_date: h.periodo_fim || null,
        }));
        await supabaseAdmin.from("candidate_work_history").insert(rows);
      }
    } catch (e) {
      console.warn("work history insert skipped", e);
    }

    // 6. If job_id: create application as hunting lead
    if (body.job_id) {
      try {
        await supabaseAdmin.from("recruitment_applications").insert({
          account_id: body.account_id,
          candidate_id: candidate.id,
          job_id: body.job_id,
          source: "chrome_extension",
          status: "lead",
        });
      } catch (e) {
        console.warn("application insert skipped", e);
      }
    }

    // 7. Internal notification (best-effort)
    try {
      await supabaseAdmin.from("notifications").insert({
        account_id: body.account_id,
        user_id: captured_by,
        title: "Perfil capturado via extensão",
        message: `${fullName}${cargo ? `, ${cargo}` : ""}${empresa ? ` — ${empresa}` : ""}`,
        type: "info",
      });
    } catch (e) {
      console.warn("notification insert skipped", e);
    }

    // 8. Mark capture as completed
    await supabaseAdmin
      .from("chrome_extension_captures")
      .update({
        processing_status: "completed",
        candidate_id: candidate.id,
        processed_data: structured || null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", capture.id);

    return json(200, {
      candidate_id: candidate.id,
      is_duplicate: false,
      candidate_name: fullName,
      candidate_url: `/recruitment/candidates/${candidate.id}`,
    });
  } catch (e) {
    console.error("extension-capture-profile error", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
