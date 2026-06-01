// NPS — Envia pesquisa de NPS para candidato (WhatsApp ou Email)
// Triggers: 'exit' (imediato) ou 'hired' (cria pending para 7d depois — disparado pelo cron sla-monitor)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { RESEND_DEFAULT_FROM_EMAIL } from "../_shared/resend-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SendRequest {
  candidate_id: string;
  job_id?: string | null;
  trigger: "exit" | "hired";
  exit_stage?: string | null;
  application_id?: string | null;
  account_id: string;
  // Opcional: se já existe registro pending (cron), passar id direto para enviar
  nps_id?: string;
}

async function generateMessage(params: {
  candidate_name: string;
  job_title: string;
  consultancy_name: string;
  trigger: "exit" | "hired";
  link: string;
}): Promise<string> {
  const { candidate_name, job_title, consultancy_name, trigger, link } = params;

  if (!LOVABLE_API_KEY) {
    // Fallback estático
    if (trigger === "hired") {
      return `Olá ${candidate_name}! Parabéns pela contratação como ${job_title}! 🎉\n\nA ${consultancy_name} gostaria de saber sua opinião sobre o processo. Leva menos de 1 minuto:\n\n${link}`;
    }
    return `Olá ${candidate_name}, agradecemos sua participação no processo para ${job_title} pela ${consultancy_name}. Sua opinião é muito importante — leva menos de 1 minuto:\n\n${link}`;
  }

  const prompt = `Escreva uma mensagem curta pedindo feedback sobre um processo seletivo.

Tom: humano, caloroso, não corporativo, não robótico.

Dados:
- Nome do candidato: ${candidate_name}
- Resultado: ${trigger === "hired" ? "contratado" : "não selecionado / saiu do processo"}
- Cargo da vaga: ${job_title}
- Nome da consultoria: ${consultancy_name}
- Link de resposta: ${link}

Regras:
- Máximo 4 linhas
- Mencione o cargo e a consultoria de forma natural
- Deixe claro que leva menos de 1 minuto responder
- Se contratado: tom de parabenização genuína + pedido de feedback
- Se não selecionado: tom de agradecimento respeitoso pela participação
- Não use linguagem corporativa
- Inclua o link no final

Retorne apenas a mensagem, sem aspas, sem explicações.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error("AI Gateway error:", res.status, await res.text());
      throw new Error("ai_failed");
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (text) return text;
    throw new Error("empty_response");
  } catch (e) {
    console.error("AI generation failed, using fallback:", e);
    if (trigger === "hired") {
      return `${candidate_name}, parabéns pela contratação como ${job_title}! 🎉 A ${consultancy_name} gostaria de ouvir sua opinião sobre o processo (1 min): ${link}`;
    }
    return `${candidate_name}, obrigado pela participação no processo de ${job_title} pela ${consultancy_name}. Sua opinião nos ajuda a melhorar (1 min): ${link}`;
  }
}

async function sendViaEmail(params: {
  to: string;
  subject: string;
  text: string;
  fromName: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "resend_not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${params.fromName} <${RESEND_DEFAULT_FROM_EMAIL}>`,
        to: [params.to],
        subject: params.subject,
        text: params.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `resend_${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "email_error" };
  }
}

async function sendViaWhatsApp(supabase: any, params: {
  to: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: { toPhoneE164: params.to, message: params.message },
    });
    if (error) return { ok: false, error: String(error?.message || error) };
    if (data?.success === false) return { ok: false, error: data?.error || "wa_failed" };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "wa_error" };
  }
}

function getPublicSiteUrl(): string {
  return Deno.env.get("PUBLIC_SITE_URL") || "https://gentia.lovable.app";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: SendRequest = await req.json();

    let npsRecord: any;

    if (body.nps_id) {
      // Cron está pedindo envio de pending registrado
      const { data, error } = await supabase
        .from("candidate_nps")
        .select("*")
        .eq("id", body.nps_id)
        .single();
      if (error || !data) throw new Error("nps_not_found");
      npsRecord = data;
    } else {
      if (!body.candidate_id || !body.account_id || !body.trigger) {
        return new Response(
          JSON.stringify({ success: false, error: "missing_required_fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verifica duplicata
      const { data: existing } = await supabase
        .from("candidate_nps")
        .select("id, send_status")
        .eq("candidate_id", body.candidate_id)
        .eq("trigger", body.trigger)
        .eq(body.job_id ? "job_id" : "candidate_id", body.job_id || body.candidate_id)
        .maybeSingle();

      if (existing && existing.send_status !== "failed") {
        // Já existe — para hired pendente, reaproveita; para outros, ignora
        if (body.trigger === "hired" && existing.send_status === "pending") {
          // Verifica se está na hora de enviar
          const { data: rec } = await supabase
            .from("candidate_nps")
            .select("*")
            .eq("id", existing.id)
            .single();
          npsRecord = rec;
        } else {
          return new Response(
            JSON.stringify({ success: true, skipped: true, reason: "already_exists", id: existing.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Cria novo
        const scheduledFor = body.trigger === "hired"
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const insertPayload: any = {
          account_id: body.account_id,
          candidate_id: body.candidate_id,
          job_id: body.job_id || null,
          application_id: body.application_id || null,
          trigger: body.trigger,
          exit_stage: body.exit_stage || null,
          send_status: body.trigger === "hired" ? "pending" : "pending",
          scheduled_for: scheduledFor,
        };

        const { data: created, error: createErr } = await supabase
          .from("candidate_nps")
          .insert(insertPayload)
          .select()
          .single();

        if (createErr) {
          // Conflito de unique constraint — tudo bem
          if (createErr.code === "23505") {
            return new Response(
              JSON.stringify({ success: true, skipped: true, reason: "duplicate" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw createErr;
        }
        npsRecord = created;

        // Para 'hired', NÃO envia agora — fica no pending até o cron disparar 7d depois
        if (body.trigger === "hired") {
          return new Response(
            JSON.stringify({ success: true, scheduled: true, id: created.id, scheduled_for: scheduledFor }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Buscar dados do candidato + vaga + consultoria
    const { data: candidate } = await supabase
      .from("recruitment_candidates")
      .select("name, email, phone")
      .eq("id", npsRecord.candidate_id)
      .single();

    if (!candidate) throw new Error("candidate_not_found");

    const { data: job } = npsRecord.job_id
      ? await supabase.from("recruitment_jobs").select("title").eq("id", npsRecord.job_id).single()
      : { data: null };

    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", npsRecord.account_id)
      .single();

    const consultancyName = company?.name || "Consultoria";
    const jobTitle = job?.title || "Processo seletivo";
    const link = `${getPublicSiteUrl()}/nps/${npsRecord.response_token}`;

    const message = await generateMessage({
      candidate_name: candidate.name || "Candidato",
      job_title: jobTitle,
      consultancy_name: consultancyName,
      trigger: npsRecord.trigger,
      link,
    });

    // Tenta WhatsApp primeiro, fallback email
    let channel: "whatsapp" | "email" | null = null;
    let sendErr: string | null = null;

    if (candidate.phone) {
      const result = await sendViaWhatsApp(supabase, { to: candidate.phone, message });
      if (result.ok) channel = "whatsapp";
      else sendErr = result.error || null;
    }

    if (!channel && candidate.email) {
      const subject = npsRecord.trigger === "hired"
        ? `Parabéns pela contratação! Sua opinião conta`
        : `Sua opinião sobre o processo seletivo`;
      const result = await sendViaEmail({
        to: candidate.email,
        subject,
        text: message,
        fromName: consultancyName,
      });
      if (result.ok) channel = "email";
      else sendErr = result.error || sendErr;
    }

    if (!channel) {
      await supabase.from("candidate_nps")
        .update({ send_status: "failed", send_error: sendErr || "no_channel_available" })
        .eq("id", npsRecord.id);
      return new Response(
        JSON.stringify({ success: false, error: sendErr || "no_channel_available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("candidate_nps")
      .update({
        send_status: "sent",
        send_channel: channel,
        sent_at: new Date().toISOString(),
        send_error: null,
      })
      .eq("id", npsRecord.id);

    console.log(`NPS sent via ${channel} to candidate ${npsRecord.candidate_id}`);

    return new Response(
      JSON.stringify({ success: true, channel, id: npsRecord.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[nps-send] error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
