import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { consumeAICredits } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateReplyRequest {
  conversation_id: string;
  custom_prompt?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

  if (!lovableApiKey) {
    return new Response(JSON.stringify({ error: "AI not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: GenerateReplyRequest = await req.json();
    const { conversation_id, custom_prompt } = body;

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "conversation_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch conversation with campaign details
    const { data: conversation, error: convError } = await supabase
      .from("recruitment_outreach_conversations")
      .select(`
        id,
        contact_name,
        messages,
        ai_context,
        campaign_id,
        recruitment_outreach_campaigns (
          name,
          ai_persona,
          job_id,
          recruitment_jobs (
            title,
            description
          )
        )
      `)
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const campaign = (conversation as any).recruitment_outreach_campaigns;
    const job = campaign?.recruitment_jobs;

    // Build conversation history
    const messages = (conversation.messages || []).slice(-8);
    const conversationHistory = messages.map((m: any) => ({
      role: m.type === "inbound" ? "user" : "assistant",
      content: m.content,
    }));

    // Build system prompt
    const systemPrompt = `Você é um recrutador profissional respondendo candidatos via WhatsApp.

Persona: ${campaign?.ai_persona || "Recrutador profissional, amigável e objetivo"}

${job ? `Vaga em questão: ${job.title}
${job.description ? `Descrição: ${job.description.substring(0, 300)}...` : ""}` : ""}

Nome do candidato: ${conversation.contact_name}

Regras:
- Responda de forma natural e conversacional
- Máximo 250 caracteres
- Se o candidato fez perguntas, responda diretamente
- Mantenha o interesse e encaminhe para próximos passos se possível
- NÃO use saudações no início se já está no meio da conversa
- NÃO seja genérico demais
- Use emoji com moderação (máximo 1-2)

${custom_prompt ? `Instrução adicional: ${custom_prompt}` : ""}`;

    // Generate reply
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: await getConfiguredModel("outreach-generate-reply", "google/gemini-2.5-flash"),
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[outreach-generate-reply] AI error:", errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const suggestedReply = data.choices?.[0]?.message?.content?.trim();

    // Consume AI credits
    const accountId = (conversation as any).account_id;
    if (accountId) {
      await consumeAICredits({
        supabase,
        accountId,
        aiData: data,
        model: 'google/gemini-2.5-flash',
        referenceId: conversation_id,
        referenceType: 'outreach_reply',
        description: `Resposta sugerida para ${conversation.contact_name}`,
        userId: user.id,
      });
    }

    if (!suggestedReply) {
      return new Response(JSON.stringify({ error: "No reply generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      suggested_reply: suggestedReply,
      conversation_id: conversation_id,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[outreach-generate-reply] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
