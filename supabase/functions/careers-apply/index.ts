// Edge Function: careers-apply
// Recebe candidatura via página white-label. Público.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplyPayload {
  slug: string;
  job_id: string;
  full_name: string;
  email: string;
  phone?: string;
  linkedin_url?: string;
  message?: string;
  cv_base64?: string;
  cv_filename?: string;
  privacy_consent: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body: ApplyPayload = await req.json();
    if (!body.slug || !body.job_id || !body.full_name || !body.email || !body.privacy_consent) {
      return new Response(JSON.stringify({ error: "missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolver página + cliente
    const { data: page, error: pageErr } = await supabase
      .from("client_career_pages")
      .select("id, account_id, client_id, slug")
      .eq("slug", body.slug)
      .eq("is_active", true)
      .maybeSingle();

    if (pageErr || !page) {
      return new Response(JSON.stringify({ error: "page not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar vaga pertence ao cliente
    const { data: job } = await supabase
      .from("recruitment_jobs")
      .select("id, title, account_id, cliente_id, status")
      .eq("id", body.job_id)
      .maybeSingle();

    if (!job || job.cliente_id !== page.client_id || job.status !== "active") {
      return new Response(JSON.stringify({ error: "invalid job" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload do CV se fornecido
    let cv_url: string | null = null;
    if (body.cv_base64 && body.cv_filename) {
      try {
        const binary = Uint8Array.from(atob(body.cv_base64), (c) => c.charCodeAt(0));
        const safeName = body.cv_filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${page.account_id}/career-${page.slug}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("external-resumes")
          .upload(path, binary, {
            contentType: body.cv_filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
            upsert: false,
          });
        if (!upErr) cv_url = path;
      } catch (e) {
        console.warn("[careers-apply] cv upload failed:", e);
      }
    }

    // Dedup candidato por email
    const { data: existing } = await supabase
      .from("recruitment_candidates")
      .select("id")
      .eq("account_id", page.account_id)
      .eq("email", body.email.toLowerCase().trim())
      .maybeSingle();

    let candidate_id = existing?.id;
    if (!candidate_id) {
      const { data: created, error: candErr } = await supabase
        .from("recruitment_candidates")
        .insert({
          account_id: page.account_id,
          full_name: body.full_name,
          email: body.email.toLowerCase().trim(),
          phone: body.phone || null,
          linkedin_url: body.linkedin_url || null,
          source: "career_page",
          cv_url,
        })
        .select("id")
        .single();
      if (candErr) throw candErr;
      candidate_id = created.id;
    } else if (cv_url || body.phone || body.linkedin_url) {
      await supabase.from("recruitment_candidates").update({
        ...(cv_url ? { cv_url } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.linkedin_url ? { linkedin_url: body.linkedin_url } : {}),
      }).eq("id", candidate_id);
    }

    // Verificar se já existe application
    const { data: existingApp } = await supabase
      .from("recruitment_applications")
      .select("id")
      .eq("candidate_id", candidate_id)
      .eq("job_id", body.job_id)
      .maybeSingle();

    if (existingApp) {
      return new Response(JSON.stringify({ ok: true, duplicate: true, application_id: existingApp.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: app, error: appErr } = await supabase
      .from("recruitment_applications")
      .insert({
        account_id: page.account_id,
        candidate_id,
        job_id: body.job_id,
        source: "career_page",
        status: "pending",
        notes: body.message || null,
      })
      .select("id")
      .single();
    if (appErr) throw appErr;

    // Incrementar contador
    await supabase.rpc("increment_career_page_applications", { _page_id: page.id });

    // Reaproveitar avaliações Cultural/DISC já feitas pelo candidato em outras vagas da mesma empresa
    try {
      const reuseUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/reuse-prior-assessments`;
      fetch(reuseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          candidate_id,
          account_id: page.account_id,
          job_id: body.job_id,
        }),
      }).catch((e) => console.warn("[careers-apply] reuse invoke:", e));
    } catch (e) { console.warn("[careers-apply] reuse setup error:", e); }

    // Disparar parsing do CV (fire-and-forget; não bloqueia resposta nem cobra créditos)
    if (cv_url) {
      try {
        const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/parse-candidate-cv`;
        fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            candidate_id,
            account_id: page.account_id,
            cv_storage_path: cv_url,
          }),
        }).catch((e) => console.warn("[careers-apply] parse-cv invoke:", e));
      } catch (e) { console.warn("[careers-apply] parse-cv setup error:", e); }
    }

    // Enviar email de confirmação via Resend (best-effort)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "GENTIA <noreply@notify.gentia.tech>",
            to: [body.email],
            subject: `Candidatura recebida — ${job.title}`,
            html: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#0F172A">Candidatura recebida ✓</h2>
              <p>Olá ${body.full_name.split(" ")[0]},</p>
              <p>Recebemos sua candidatura para a vaga <strong>${job.title}</strong>.</p>
              <p>Nossa equipe analisará seu perfil em breve. Se houver fit, entraremos em contato pelos próximos passos.</p>
              <p style="color:#64748B;font-size:13px;margin-top:32px">— Equipe de Recrutamento</p>
            </div>`,
          }),
        });
      } catch (e) { console.warn("[careers-apply] email error:", e); }
    }

    // Notificar recrutador
    try {
      await supabase.from("notifications").insert({
        account_id: page.account_id,
        title: "Nova candidatura via Página de Carreiras",
        message: `${body.full_name} se candidatou para "${job.title}"`,
        type: "info",
        category: "recruitment",
        link: `/atracao-contratacao/recrutamento/jobs/${body.job_id}`,
        dedupe_key: `career_apply_${app.id}`,
      });
    } catch (e) { console.warn("[careers-apply] notify error:", e); }

    return new Response(JSON.stringify({ ok: true, application_id: app.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[careers-apply] error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
