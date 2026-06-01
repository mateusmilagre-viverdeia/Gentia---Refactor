// Edge Function: link-candidate-self
// Fallback de identidade do candidato: quando o candidato autenticado abre a
// página de uma vaga mas o frontend não consegue resolver o recruitment_candidate
// (multi-tenant, email divergente, application órfã), permite vincular/criar
// o candidato e a application para aquela vaga sem disparar e-mails/whatsapps.
//
// Sempre opera com `skip_notifications` lógico (não chama orchestrator).
// Idempotente: se candidato/application já existir, retorna os ids existentes.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;
    const email = (user.email || "").toLowerCase().trim();
    if (!email) {
      return new Response(JSON.stringify({ error: "user has no email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const job_id: string | undefined = body?.job_id;
    if (!job_id || typeof job_id !== "string") {
      return new Response(JSON.stringify({ error: "missing job_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Valida vaga + extrai account_id (server-side, não confia no client)
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("recruitment_jobs")
      .select("id, account_id, status, title")
      .eq("id", job_id)
      .maybeSingle();
    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: "job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve nome do candidato a partir de candidate_profiles se existir
    let first_name = "";
    let last_name = "";
    const bodyFullName = (body?.full_name as string | undefined)?.trim() || "";
    if (bodyFullName) {
      const parts = bodyFullName.split(/\s+/);
      first_name = parts[0] || "";
      last_name = parts.slice(1).join(" ") || "";
    }
    if (!first_name) {
      const { data: prof } = await supabaseAdmin
        .from("candidate_profiles")
        .select("first_name, last_name, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const profAny = prof as any;
      first_name = (profAny?.first_name as string | undefined)?.trim() || "";
      last_name = (profAny?.last_name as string | undefined)?.trim() || "";
      if (!first_name && profAny?.full_name) {
        const parts = String(profAny.full_name).trim().split(/\s+/);
        first_name = parts[0] || "";
        last_name = parts.slice(1).join(" ") || "";
      }
    }
    if (!first_name) first_name = email.split("@")[0] || email;

    // 1. Busca ou cria recruitment_candidate na conta da vaga
    const { data: existingCand } = await supabaseAdmin
      .from("recruitment_candidates")
      .select("id")
      .eq("account_id", job.account_id)
      .eq("email", email)
      .maybeSingle();

    let candidate_id = existingCand?.id as string | undefined;
    let createdCandidate = false;
    if (!candidate_id) {
      const { data: created, error: candErr } = await supabaseAdmin
        .from("recruitment_candidates")
        .insert({
          account_id: job.account_id,
          first_name,
          last_name,
          email,
          source: "candidate_self_link",
        })
        .select("id")
        .single();
      if (candErr) throw candErr;
      candidate_id = created.id;
      createdCandidate = true;
    }

    // 2. Busca ou cria application para a vaga
    const { data: existingApp } = await supabaseAdmin
      .from("recruitment_applications")
      .select("id, status")
      .eq("candidate_id", candidate_id)
      .eq("job_id", job_id)
      .maybeSingle();

    let application_id = existingApp?.id as string | undefined;
    let createdApplication = false;
    if (!application_id) {
      const { data: app, error: appErr } = await supabaseAdmin
        .from("recruitment_applications")
        .insert({
          account_id: job.account_id,
          candidate_id,
          job_id,
          source: "candidate_self_link",
          status: "applied",
        })
        .select("id")
        .single();
      if (appErr) throw appErr;
      application_id = app.id;
      createdApplication = true;

      // Tracking event + consent (somente na criação inicial — idempotente)
      try {
        await supabaseAdmin.from("candidate_tracking_events").insert({
          account_id: job.account_id,
          candidate_id,
          job_id,
          application_id,
          event_type: "submitted_application",
          source: "candidate_self_link",
        });
      } catch (trackErr) {
        console.warn("[link-candidate-self] tracking event failed:", trackErr);
      }

      try {
        await supabaseAdmin
          .from("recruitment_candidate_contact_prefs")
          .upsert(
            {
              account_id: job.account_id,
              candidate_id,
              opt_out_all: false,
              consent_source: "candidate_self_link",
              consent_channel: "web",
              consent_message: "Candidato confirmou candidatura pela plataforma",
              consent_at: new Date().toISOString(),
              consent_job_id: job_id,
            },
            { onConflict: "candidate_id" },
          );
      } catch (prefErr) {
        console.warn("[link-candidate-self] contact prefs upsert failed:", prefErr);
      }
    }

    console.log("[link-candidate-self] ok", {
      user_id: user.id,
      job_id,
      account_id: job.account_id,
      candidate_id,
      application_id,
      createdCandidate,
      createdApplication,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        candidate_id,
        application_id,
        created_candidate: createdCandidate,
        created_application: createdApplication,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[link-candidate-self] error:", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
