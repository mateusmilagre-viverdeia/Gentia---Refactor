import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmailViaResend } from "../_shared/resend-email.ts";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("send-rejection-notification");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RejectionRequest {
  applicationId: string;
  reason?: "manual" | "threshold_not_met";
  triggeredBy?: string | null;
  notify?: boolean; // default true
  // Optional context for orchestrator-driven calls
  stepType?: string;
  score?: number;
  threshold?: number;
}

function rejectEmailTemplate(name: string, jobTitle: string) {
  return {
    subject: `Sobre sua participação no processo para ${jobTitle}`,
    html: `
<div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#64748b 0%,#475569 100%);padding:30px;border-radius:16px 16px 0 0;">
    <h1 style="color:white;margin:0;font-size:24px;">Olá, ${name}</h1>
  </div>
  <div style="background:#f8fafc;padding:30px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      Agradecemos imensamente pelo seu interesse e pela sua participação no processo seletivo para a vaga de <strong>${jobTitle}</strong>.
    </p>
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      Após uma análise cuidadosa, informamos que não iremos seguir com a sua candidatura neste momento. Essa decisão não reflete necessariamente a sua capacidade ou potencial.
    </p>
    <p style="font-size:16px;color:#334155;line-height:1.6;">
      Agradecemos o tempo dedicado e desejamos muito sucesso na sua jornada profissional!
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="font-size:12px;color:#94a3b8;text-align:center;">Processo gerenciado por Gent.IA</p>
  </div>
</div>`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RejectionRequest;
    const { applicationId, reason = "manual", triggeredBy = null, notify = true, stepType, score, threshold } = body;

    if (!applicationId) {
      return new Response(JSON.stringify({ error: "applicationId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // JWT validation when called from frontend (manual flow)
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!notify) {
      logger.info("Notification skipped (notify=false)", { applicationId });
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "notify_false" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load application + candidate + job
    const { data: app, error: appErr } = await supabase
      .from("recruitment_applications")
      .select("id, candidate_id, job_id, account_id, status")
      .eq("id", applicationId)
      .maybeSingle();

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: "application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { candidate_id: candidateId, job_id: jobId, account_id: accountId } = app;

    // Idempotency: skip if a workflow_reject was already sent in last 24h for this candidate+job
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("recruitment_communications_log")
      .select("id, channel")
      .eq("candidate_id", candidateId)
      .eq("job_id", jobId)
      .eq("message_type", "workflow_reject")
      .eq("status", "sent")
      .gte("created_at", since);

    const alreadySentEmail = existing?.some((r: any) => r.channel === "email");
    const alreadySentWA = existing?.some((r: any) => r.channel === "whatsapp");
    if (alreadySentEmail && alreadySentWA) {
      logger.info("Idempotent skip: rejection already sent in last 24h", { applicationId });
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load candidate + job details
    const [{ data: candidate }, { data: job }, { data: account }] = await Promise.all([
      supabase.from("recruitment_candidates").select("id, full_name, email, phone").eq("id", candidateId).maybeSingle(),
      supabase.from("recruitment_jobs").select("id, title").eq("id", jobId).maybeSingle(),
      supabase.from("accounts").select("id, name").eq("id", accountId).maybeSingle(),
    ]);

    const candidateName = candidate?.full_name || "Candidato(a)";
    const jobTitle = job?.title || "a vaga";
    const companyName = account?.name || "a empresa";
    const baseMeta = { reason, triggered_by: triggeredBy, step_type: stepType, score, threshold };

    const result: { email?: string; whatsapp?: string } = {};

    // EMAIL
    if (!alreadySentEmail && candidate?.email) {
      try {
        const tmpl = rejectEmailTemplate(candidateName, jobTitle);
        await sendEmailViaResend({
          supabase,
          to: candidate.email,
          subject: tmpl.subject,
          html: tmpl.html,
          accountId,
          candidateId,
          jobId,
        });
        await supabase.from("recruitment_communications_log").insert({
          candidate_id: candidateId,
          job_id: jobId,
          account_id: accountId,
          recipient: candidate.email,
          channel: "email",
          message_type: "workflow_reject",
          status: "sent",
          metadata: baseMeta,
        });
        result.email = "sent";
      } catch (err) {
        logger.error("Email failed", { err: String(err) });
        await supabase.from("recruitment_communications_log").insert({
          candidate_id: candidateId,
          job_id: jobId,
          account_id: accountId,
          recipient: candidate.email,
          channel: "email",
          message_type: "workflow_reject",
          status: "failed",
          error_message: String(err),
          metadata: baseMeta,
        });
        result.email = "failed";
      }
    } else if (alreadySentEmail) {
      result.email = "skipped";
    } else {
      result.email = "no_recipient";
    }

    // WHATSAPP — delegate to existing function
    if (!alreadySentWA && candidate?.phone) {
      try {
        const { error: waErr } = await supabase.functions.invoke("send-rejection-whatsapp", {
          body: {
            candidateId,
            candidateName,
            candidatePhone: candidate.phone,
            jobId,
            jobTitle,
            accountId,
            companyName,
            stepType: stepType || "manual",
            score: score ?? 0,
            threshold: threshold ?? 0,
          },
        });
        if (waErr) throw waErr;
        await supabase.from("recruitment_communications_log").insert({
          candidate_id: candidateId,
          job_id: jobId,
          account_id: accountId,
          recipient: candidate.phone,
          channel: "whatsapp",
          message_type: "workflow_reject",
          status: "sent",
          metadata: baseMeta,
        });
        result.whatsapp = "sent";
      } catch (err) {
        logger.error("WhatsApp failed", { err: String(err) });
        await supabase.from("recruitment_communications_log").insert({
          candidate_id: candidateId,
          job_id: jobId,
          account_id: accountId,
          recipient: candidate.phone,
          channel: "whatsapp",
          message_type: "workflow_reject",
          status: "failed",
          error_message: String(err),
          metadata: baseMeta,
        });
        result.whatsapp = "failed";
      }
    } else if (alreadySentWA) {
      result.whatsapp = "skipped";
    } else {
      result.whatsapp = "no_recipient";
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error("Unhandled error", { err: String(err) });
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
