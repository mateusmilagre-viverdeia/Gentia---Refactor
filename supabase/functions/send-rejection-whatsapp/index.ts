import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendWhatsAppViaMeta, isMetaWhatsAppConfigured, sendWhatsAppTemplateMeta, getWorkflowTemplateConfig } from "../_shared/whatsapp-meta.ts";
import { createLogger } from "../_shared/logger.ts";
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const logger = createLogger("send-rejection-whatsapp");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RejectionWhatsAppRequest {
  candidateId: string;
  candidateName: string;
  candidatePhone: string;
  jobId: string;
  jobTitle: string;
  accountId: string;
  companyName: string;
  stepType: "cultural" | "disc" | "technical";
  score: number;
  threshold: number;
  sessionId?: string;
}

// Step-specific feedback context for AI
const STEP_FEEDBACK_CONTEXT: Record<string, string> = {
  cultural: "alinhamento com a cultura e valores da empresa",
  disc: "perfil comportamental e características para a posição",
  technical: "habilidades técnicas específicas exigidas para o cargo",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: RejectionWhatsAppRequest = await req.json();
    const {
      candidateId,
      candidateName,
      candidatePhone,
      jobId,
      jobTitle,
      accountId,
      companyName,
      stepType,
      score,
      threshold,
      sessionId,
    } = body;

    logger.info("Processing rejection WhatsApp", {
      candidateId,
      candidateName,
      jobTitle,
      stepType,
      score,
      threshold,
    });

    // Validate required fields
    if (!candidateId || !candidatePhone || !jobTitle || !accountId || !stepType) {
      logger.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if Meta WhatsApp is configured
    const whatsappConfigured = await isMetaWhatsAppConfigured(supabase);
    if (!whatsappConfigured) {
      logger.warn("Meta WhatsApp API not configured or inactive, skipping rejection WhatsApp");
      return new Response(
        JSON.stringify({ success: false, skipped: true, reason: "Meta WhatsApp API not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if Lovable AI is available
    if (!lovableApiKey) {
      logger.warn("LOVABLE_API_KEY not configured, using fallback message");
    }

    let message: string;

    if (lovableApiKey) {
      // Generate personalized feedback using AI
      const stepContext = STEP_FEEDBACK_CONTEXT[stepType] || "etapa do processo";
      
      const systemPrompt = `Você é um recrutador empático e profissional.
Gere uma mensagem de feedback de não aprovação para WhatsApp (máximo 400 caracteres).

REGRAS OBRIGATÓRIAS:
1. Seja respeitoso, empático e encorajador
2. NÃO mencione scores, números ou porcentagens específicas
3. NÃO use linguagem corporativa fria
4. Agradeça a participação no processo
5. Deixe porta aberta para futuras oportunidades
6. Use tom humano e acolhedor
7. Comece com "Olá ${candidateName}!"
8. Use no máximo 1-2 emojis
9. Não mencione o motivo específico da reprovação de forma negativa
10. NUNCA diga que o candidato foi aprovado ou que a vaga é dele

CONTEXTO:
- Empresa: ${companyName}
- Vaga: ${jobTitle}
- Etapa da reprovação: ${stepType}
- Área avaliada: ${stepContext}

EXEMPLO BOM:
"Olá Maria! Agradeço muito sua participação no processo para Analista na TechCo. Neste momento, seguiremos com perfis mais alinhados ao momento da vaga. Seu interesse foi muito bem-vindo e te encorajo a acompanhar nossas próximas oportunidades! 🤝"`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: await getConfiguredModel("send-rejection-whatsapp", "google/gemini-2.5-flash"),
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Gere a mensagem de feedback para ${candidateName} que participou do processo seletivo para ${jobTitle} na ${companyName} e não foi aprovado na etapa de ${stepType}.` },
            ],
            max_tokens: 300,
            temperature: 0.7,
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          message = data.choices?.[0]?.message?.content?.trim() || "";
          
          // Ensure message is not too long
          if (message.length > 450) {
            message = message.substring(0, 447) + "...";
          }
          
          // Consume credits
          if (accountId) {
            const modelUsed = await getConfiguredModel("send-rejection-whatsapp", "google/gemini-2.5-flash");
            await consumeAICredits({
              supabase,
              accountId,
              aiData: data,
              model: modelUsed,
              referenceId: jobId,
              referenceType: 'rejection_message',
              description: `Mensagem de rejeição - ${jobTitle}`,
            });
          }
          
          logger.info("AI generated rejection message", { messageLength: message.length });
        } else {
          const errorText = await aiResponse.text();
          logger.error("AI error, using fallback", { status: aiResponse.status, error: errorText });
          message = "";
        }
      } catch (aiError) {
        logger.error("AI request failed, using fallback", { error: aiError });
        message = "";
      }
    } else {
      message = "";
    }

    // Fallback message if AI failed or not configured
    if (!message) {
      message = `Olá ${candidateName}! Agradeço sua participação no processo seletivo para ${jobTitle} na ${companyName}. Neste momento, seguiremos com outros candidatos mais alinhados ao perfil da vaga. Desejo sucesso na sua jornada e te encorajo a acompanhar nossas próximas oportunidades! 🤝`;
    }

    // Send via Meta Cloud API — try template first, then fallback to free-form
    let sendResult: { success: boolean; messageId?: string; error?: string } = { success: false };
    let usedTemplate = false;

    try {
      const templateConfig = await getWorkflowTemplateConfig(supabase);
      if (templateConfig.rejection) {
        logger.info("Using configured rejection template", { template: templateConfig.rejection.name });
        sendResult = await sendWhatsAppTemplateMeta({
          supabase,
          toPhone: candidatePhone,
          templateName: templateConfig.rejection.name,
          templateLanguage: templateConfig.rejection.language,
          bodyParams: [candidateName, jobTitle],
        });
        usedTemplate = true;
        if (!sendResult.success) {
          logger.warn("Template send failed, falling back to free-form", { error: sendResult.error });
          usedTemplate = false;
        }
      }

      if (!sendResult.success) {
        sendResult = await sendWhatsAppViaMeta({
          supabase,
          toPhone: candidatePhone,
          message,
        });
      }

      if (sendResult.success) {
        logger.info("Rejection WhatsApp sent successfully via Meta API", { messageId: sendResult.messageId, usedTemplate });

        // Log to recruitment_communications_log
        await supabase.from("recruitment_communications_log").insert({
          account_id: accountId,
          candidate_id: candidateId,
          application_id: null,
          job_id: jobId,
          session_id: sessionId || null,
          message_type: "rejection",
          channel: "whatsapp",
          recipient: candidatePhone,
          subject: null,
          body: usedTemplate ? `[Template] ${message}` : message,
          status: "sent",
          provider: "meta",
          provider_message_id: sendResult.messageId || null,
          error_code: null,
          error_message: null,
          metadata: {
            step_type: stepType,
            score,
            threshold,
            ai_generated: !!lovableApiKey,
            rejection_reason: "threshold_not_met",
            used_template: usedTemplate,
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Rejection WhatsApp sent",
            channel: "whatsapp",
            aiGenerated: !!lovableApiKey,
            usedTemplate,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        logger.error("Failed to send rejection WhatsApp via Meta API", { error: sendResult.error });

        // Log the failure
        await supabase.from("recruitment_communications_log").insert({
          account_id: accountId,
          candidate_id: candidateId,
          application_id: null,
          job_id: jobId,
          session_id: sessionId || null,
          message_type: "rejection",
          channel: "whatsapp",
          recipient: candidatePhone,
          subject: null,
          body: message,
          status: "failed",
          provider: "meta",
          provider_message_id: null,
          error_code: "SEND_FAILED",
          error_message: sendResult.error || "Unknown error",
          metadata: {
            step_type: stepType,
            score,
            threshold,
            ai_generated: !!lovableApiKey,
          },
        });

        return new Response(
          JSON.stringify({
            success: false,
            error: sendResult.error || "Failed to send WhatsApp",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (sendError: any) {
      logger.error("Failed to send rejection WhatsApp", { error: sendError });

      await supabase.from("recruitment_communications_log").insert({
        account_id: accountId,
        candidate_id: candidateId,
        application_id: null,
        job_id: jobId,
        session_id: sessionId || null,
        message_type: "rejection",
        channel: "whatsapp",
        recipient: candidatePhone,
        subject: null,
        body: message,
        status: "failed",
        provider: "meta",
        provider_message_id: null,
        error_code: "SEND_FAILED",
        error_message: sendError?.message || "Unknown error",
        metadata: {
          step_type: stepType,
          score,
          threshold,
          ai_generated: !!lovableApiKey,
        },
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: sendError?.message || "Failed to send WhatsApp",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    logger.error("Error in send-rejection-whatsapp", { error });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
