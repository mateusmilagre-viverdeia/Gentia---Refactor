import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ZApiWebhookPayload {
  phone?: string;
  text?: { message?: string };
  status?: string;
  messageId?: string;
  isStatusReply?: boolean;
  type?: string;
  fromMe?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const payload: ZApiWebhookPayload = await req.json();
    console.log("[outreach-webhook] Received:", JSON.stringify(payload));

    // Skip if it's our own message or a status update
    if (payload.fromMe || payload.isStatusReply) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = payload.phone?.replace(/\D/g, "");
    const messageText = payload.text?.message || "";

    if (!phone || !messageText) {
      console.log("[outreach-webhook] No phone or message, skipping");
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find conversation by phone
    const { data: conversations, error: convError } = await supabase
      .from("recruitment_outreach_conversations")
      .select(`
        id,
        campaign_id,
        account_id,
        contact_name,
        contact_phone,
        status,
        messages,
        ai_replies_count,
        ai_context
      `)
      .or(`contact_phone.eq.${phone},contact_phone.eq.+${phone},contact_phone.ilike.%${phone}`)
      .in("status", ["sent", "delivered", "responded", "interested"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (convError || !conversations || conversations.length === 0) {
      console.log("[outreach-webhook] No active conversation found for phone:", phone);
      return new Response(JSON.stringify({ ok: true, no_conversation: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conversation = conversations[0];
    console.log(`[outreach-webhook] Found conversation ${conversation.id}`);

    // Find candidate by phone and update tracking
    const { data: candidate } = await supabase
      .from("recruitment_candidates")
      .select("id, first_touch_source, account_id")
      .or(`phone.eq.${phone},phone.eq.+${phone},phone.ilike.%${phone}`)
      .eq("account_id", conversation.account_id)
      .limit(1)
      .maybeSingle();

    if (candidate) {
      // Update first touch if not set
      if (!candidate.first_touch_source) {
        await supabase
          .from("recruitment_candidates")
          .update({
            first_touch_source: "whatsapp",
            first_touch_medium: "outbound",
            first_touch_at: new Date().toISOString(),
            last_touch_source: "whatsapp",
            last_touch_medium: "outbound",
            last_touch_at: new Date().toISOString(),
          })
          .eq("id", candidate.id);
        
        console.log(`[outreach-webhook] Set first touch for candidate ${candidate.id}`);
      } else {
        // Just update last touch
        await supabase
          .from("recruitment_candidates")
          .update({
            last_touch_source: "whatsapp",
            last_touch_medium: "outbound",
            last_touch_at: new Date().toISOString(),
          })
          .eq("id", candidate.id);
      }
    }

    // Get campaign settings
    const { data: campaign } = await supabase
      .from("recruitment_outreach_campaigns")
      .select("auto_reply_enabled, max_auto_replies, reply_delay_minutes, ai_persona, name")
      .eq("id", conversation.campaign_id)
      .single();

    // Add incoming message to conversation
    const messages = conversation.messages || [];
    messages.push({
      id: crypto.randomUUID(),
      type: "inbound",
      content: messageText,
      status: "received",
      created_at: new Date().toISOString(),
      zapi_id: payload.messageId,
    });

    // Classify interest with AI
    let interestScore = 50;
    let interestReason = "Respondeu à mensagem";
    let newStatus = "responded";

    if (lovableApiKey) {
      try {
        const classifyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: await getConfiguredModel("outreach-webhook-receiver", "google/gemini-2.5-flash"),
            messages: [
              {
                role: "system",
                content: `Você é um classificador de interesse de candidatos em processos de recrutamento.

Analise a resposta do candidato e classifique o nível de interesse.

Responda APENAS em JSON com este formato:
{
  "score": número de 0 a 100,
  "reason": "motivo da classificação em uma frase",
  "status": "interested" | "not_interested" | "responded" | "opted_out"
}

Critérios:
- score 80-100: Demonstra interesse claro, faz perguntas, quer saber mais
- score 50-79: Resposta neutra, pediu mais informações
- score 20-49: Demonstra hesitação ou baixo interesse
- score 0-19: Recusou, pediu para não contatar, não está interessado

Se o candidato pedir para parar de receber mensagens, status = "opted_out"
Se demonstrar interesse claro, status = "interested"
Se recusar, status = "not_interested"`
              },
              {
                role: "user",
                content: `Mensagem do candidato: "${messageText}"`
              }
            ],
            max_tokens: 150,
            temperature: 0.3,
          }),
        });

        if (classifyResponse.ok) {
          const classifyData = await classifyResponse.json();
          await consumeAICredits({
            supabase, accountId: conversation.account_id, aiData: classifyData,
            model: 'google/gemini-2.5-flash',
            referenceType: 'outreach_webhook_classify', referenceId: conversation.id,
            description: 'Classificação de interesse do candidato',
          });
          const content = classifyData.choices?.[0]?.message?.content || "";
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            interestScore = parsed.score || 50;
            interestReason = parsed.reason || "Respondeu à mensagem";
            newStatus = parsed.status || "responded";
          }
        }
      } catch (aiError) {
        console.error("[outreach-webhook] AI classification error:", aiError);
      }
    }

    // Update conversation
    await supabase
      .from("recruitment_outreach_conversations")
      .update({
        status: newStatus,
        messages: messages,
        interest_score: interestScore,
        interest_reason: interestReason,
        last_response_at: new Date().toISOString(),
        opted_out_at: newStatus === "opted_out" ? new Date().toISOString() : null,
      })
      .eq("id", conversation.id);

    // Update campaign metrics
    const { data: campaignData } = await supabase
      .from("recruitment_outreach_campaigns")
      .select("responses_received, interested_count")
      .eq("id", conversation.campaign_id)
      .single();

    const updatePayload: Record<string, number> = {
      responses_received: (campaignData?.responses_received || 0) + 1,
    };
    if (interestScore >= 70) {
      updatePayload.interested_count = (campaignData?.interested_count || 0) + 1;
    }

    await supabase
      .from("recruitment_outreach_campaigns")
      .update(updatePayload)
      .eq("id", conversation.campaign_id);

    // Log communication
    await supabase.from("recruitment_communications_log").insert({
      account_id: conversation.account_id,
      candidate_id: null,
      channel: "whatsapp",
      direction: "inbound",
      event_type: "outreach_response",
      subject: `Resposta de ${conversation.contact_name}`,
      body: messageText.substring(0, 500),
      status: "received",
      metadata: {
        conversation_id: conversation.id,
        campaign_id: conversation.campaign_id,
        interest_score: interestScore,
        interest_reason: interestReason,
        zapi_message_id: payload.messageId,
      },
    });

    // Register tracking event for WhatsApp response
    if (candidate) {
      await supabase.from("candidate_tracking_events").insert([{
        account_id: conversation.account_id,
        candidate_id: candidate.id,
        event_type: "whatsapp_replied",
        source: "whatsapp",
        medium: "outbound",
        metadata: {
          conversation_id: conversation.id,
          campaign_id: conversation.campaign_id,
          interest_score: interestScore,
          interest_reason: interestReason,
        },
      }]);
      console.log(`[outreach-webhook] Registered whatsapp_replied event for candidate ${candidate.id}`);
    }
    if (
      campaign?.auto_reply_enabled &&
      newStatus !== "opted_out" &&
      newStatus !== "not_interested" &&
      (conversation.ai_replies_count || 0) < (campaign.max_auto_replies || 5)
    ) {
      try {
        // Generate contextual reply
        const replyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: await getConfiguredModel("outreach-webhook-receiver", "google/gemini-2.5-flash"),
            messages: [
              {
                role: "system",
                content: `Você é um recrutador respondendo via WhatsApp. 

Persona: ${campaign.ai_persona || "Recrutador profissional e amigável"}

Regras:
- Responda de forma natural e conversacional
- Máximo 200 caracteres
- Mantenha o interesse do candidato
- Se ele fez uma pergunta, responda diretamente
- NÃO use saudações se já está no meio da conversa
- NÃO envie mensagens genéricas demais
- Se o candidato parecer interessado, tente agendar próximo passo`
              },
              ...messages.slice(-6).map((m: any) => ({
                role: m.type === "inbound" ? "user" : "assistant",
                content: m.content,
              })),
            ],
            max_tokens: 150,
            temperature: 0.7,
          }),
        });

        if (replyResponse.ok) {
          const replyData = await replyResponse.json();
          await consumeAICredits({
            supabase, accountId: conversation.account_id, aiData: replyData,
            model: 'google/gemini-2.5-flash',
            referenceType: 'outreach_webhook_reply', referenceId: conversation.id,
            description: 'Auto-reply gerado para outreach',
          });
          const replyContent = replyData.choices?.[0]?.message?.content?.trim();

          if (replyContent) {
            // Schedule reply with delay
            const scheduledFor = new Date();
            scheduledFor.setMinutes(scheduledFor.getMinutes() + (campaign.reply_delay_minutes || 5));

            await supabase.from("recruitment_outreach_queue").insert({
              conversation_id: conversation.id,
              account_id: conversation.account_id,
              message_type: "ai_reply",
              message_content: replyContent,
              scheduled_for: scheduledFor.toISOString(),
              status: "pending",
            });

            // Update AI replies count
            await supabase
              .from("recruitment_outreach_conversations")
              .update({
                ai_replies_count: (conversation.ai_replies_count || 0) + 1,
              })
              .eq("id", conversation.id);

            console.log(`[outreach-webhook] Auto-reply scheduled for ${scheduledFor.toISOString()}`);
          }
        }
      } catch (replyError) {
        console.error("[outreach-webhook] Auto-reply error:", replyError);
      }
    }

    console.log(`[outreach-webhook] Processed response from ${phone}, interest: ${interestScore}`);

    return new Response(JSON.stringify({
      ok: true,
      conversation_id: conversation.id,
      interest_score: interestScore,
      status: newStatus,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[outreach-webhook] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
