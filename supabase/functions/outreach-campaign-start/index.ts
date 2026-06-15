import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { aiFetch } from "../_shared/ai-gateway.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getConfiguredModel } from '../_shared/ai-model-config.ts';
import { consumeAICredits, accumulateUsage } from '../_shared/ai-credit-consumption.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StartCampaignRequest {
  campaign_id: string;
}

interface Contact {
  name: string;
  phone: string;
  email?: string;
  source_type: string;
  source_id: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const lovableApiKey = "direct" ?? "";

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
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: StartCampaignRequest = await req.json();
    const { campaign_id } = body;

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[outreach-campaign-start] Starting campaign ${campaign_id} by user ${user.id}`);

    // 1. Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("recruitment_outreach_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error("Campaign not found:", campaignError);
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      return new Response(JSON.stringify({ error: `Campaign cannot be started from status: ${campaign.status}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch contacts based on target_source
    let contacts: Contact[] = [];
    const maxContacts = campaign.max_contacts || 100;

    if (campaign.target_source === "hunting_results") {
      // Fetch min_hunting_score from job if job_id is set
      let minHuntingScore = 0;
      if (campaign.job_id) {
        const { data: jobData } = await supabase
          .from("recruitment_jobs")
          .select("min_hunting_score")
          .eq("id", campaign.job_id)
          .single();
        
        if (jobData?.min_hunting_score && jobData.min_hunting_score > 0) {
          minHuntingScore = jobData.min_hunting_score;
          console.log(`[outreach-campaign-start] Applying min_hunting_score filter: ${minHuntingScore}%`);
        }
      }

      // Build query with optional score filter and ordering
      let huntingQuery = supabase
        .from("recruitment_hunting_results")
        .select("id, name, phone, email, hunting_priority")
        .eq("account_id", campaign.account_id)
        .or("phone.not.is.null,email.not.is.null");

      // Filter by job_id if set
      if (campaign.job_id) {
        huntingQuery = huntingQuery.eq("job_id", campaign.job_id);
      }

      // Apply min score filter
      if (minHuntingScore > 0) {
        huntingQuery = huntingQuery.gte("hunting_priority", minHuntingScore);
      }

      // Order by priority (best candidates first) and apply limit
      const { data: huntingResults } = await huntingQuery
        .order("hunting_priority", { ascending: false, nullsFirst: false })
        .limit(maxContacts);

      contacts = (huntingResults || []).map((r: any) => ({
        name: r.name || "Candidato",
        phone: r.phone,
        email: r.email,
        source_type: "hunting_result",
        source_id: r.id,
      }));

      console.log(`[outreach-campaign-start] Found ${contacts.length} hunting results (min score: ${minHuntingScore}%)`);
    } else if (campaign.target_source === "talent_pool") {
      const { data: talentPool } = await supabase
        .from("talent_pool")
        .select("id, full_name, phone, email")
        .eq("account_id", campaign.account_id)
        .or("phone.not.is.null,email.not.is.null")
        .limit(maxContacts);

      contacts = (talentPool || []).map((r: any) => ({
        name: r.full_name || "Candidato",
        phone: r.phone,
        email: r.email,
        source_type: "talent_pool",
        source_id: r.id,
      }));
    } else if (campaign.target_source === "candidates") {
      const { data: candidates } = await supabase
        .from("recruitment_candidates")
        .select("id, full_name, phone, email")
        .eq("account_id", campaign.account_id)
        .or("phone.not.is.null,email.not.is.null")
        .limit(maxContacts);

      contacts = (candidates || []).map((r: any) => ({
        name: r.full_name || "Candidato",
        phone: r.phone,
        email: r.email,
        source_type: "candidate",
        source_id: r.id,
      }));
    }

    if (contacts.length === 0) {
      return new Response(JSON.stringify({ error: "No contacts found for this campaign" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[outreach-campaign-start] Found ${contacts.length} contacts`);

    // 3. Create conversations and personalize messages with AI
    let accumulatedUsage = { prompt_tokens: 0, completion_tokens: 0 };
    let aiCallCount = 0;
    const conversationsToInsert: any[] = [];
    const queueToInsert: any[] = [];

    for (const contact of contacts) {
      // Personalize message with AI
      let personalizedMessage = campaign.initial_message_template;
      
      if (lovableApiKey && campaign.ai_persona) {
        try {
          const aiResponse = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: await getConfiguredModel("outreach-campaign-start", "google/gemini-2.5-flash"),
              messages: [
                {
                  role: "system",
                  content: `Você é um assistente de recrutamento. Sua tarefa é personalizar mensagens de outreach.
                  
Persona da campanha: ${campaign.ai_persona || "Recrutador profissional e amigável"}

Regras:
- Mantenha a mensagem curta (máximo 300 caracteres)
- Use o nome do candidato de forma natural
- Mantenha o tom profissional mas acolhedor
- NÃO adicione saudações genéricas como "Olá" se já existir no template
- Retorne APENAS o texto da mensagem, sem explicações`
                },
                {
                  role: "user",
                  content: `Template original: "${campaign.initial_message_template}"

Nome do candidato: ${contact.name}

Personalize esta mensagem para o candidato, substituindo {nome} pelo nome real.`
                }
              ],
              max_tokens: 200,
              temperature: 0.7,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            personalizedMessage = aiData.choices?.[0]?.message?.content?.trim() || personalizedMessage;
            accumulatedUsage = accumulateUsage(accumulatedUsage, aiData);
            aiCallCount++;
          }
        } catch (aiError) {
          console.error("AI personalization error:", aiError);
          // Use template with simple replacement as fallback
          personalizedMessage = campaign.initial_message_template.replace(/\{nome\}/gi, contact.name);
        }
      } else {
        // Simple template replacement
        personalizedMessage = campaign.initial_message_template.replace(/\{nome\}/gi, contact.name);
      }

      const conversationId = crypto.randomUUID();

      conversationsToInsert.push({
        id: conversationId,
        campaign_id: campaign_id,
        account_id: campaign.account_id,
        hunting_result_id: contact.source_type === "hunting_result" ? contact.source_id : null,
        talent_pool_id: contact.source_type === "talent_pool" ? contact.source_id : null,
        candidate_id: contact.source_type === "candidate" ? contact.source_id : null,
        contact_name: contact.name,
        contact_phone: contact.phone,
        contact_email: contact.email,
        status: "queued",
        messages: [
          {
            id: crypto.randomUUID(),
            type: "outbound",
            content: personalizedMessage,
            status: "queued",
            created_at: new Date().toISOString(),
          }
        ],
        ai_context: {
          persona: campaign.ai_persona,
          job_title: campaign.job_id ? "Vaga relacionada" : null,
        },
      });

      queueToInsert.push({
        conversation_id: conversationId,
        account_id: campaign.account_id,
        message_type: "initial",
        message_content: personalizedMessage,
        scheduled_for: new Date().toISOString(),
        status: "pending",
      });
    }

    // 6. Insert conversations
    const { error: convError } = await supabase
      .from("recruitment_outreach_conversations")
      .insert(conversationsToInsert);

    if (convError) {
      console.error("Error inserting conversations:", convError);
      return new Response(JSON.stringify({ error: "Failed to create conversations" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Insert queue items
    const { error: queueError } = await supabase
      .from("recruitment_outreach_queue")
      .insert(queueToInsert);

    if (queueError) {
      console.error("Error inserting queue:", queueError);
    }

    // 8. Consume AI credits dynamically
    let creditsConsumed = 0;
    if (aiCallCount > 0) {
      const creditResult = await consumeAICredits({
        supabase,
        accountId: campaign.account_id,
        aiData: { usage: accumulatedUsage },
        model: 'google/gemini-2.5-flash',
        referenceId: campaign_id,
        referenceType: 'outreach_campaign',
        description: `Campanha ${campaign.name}: ${aiCallCount} mensagens personalizadas`,
        userId: user.id,
      });
      creditsConsumed = creditResult.creditsConsumed;
    } else {
      // No AI used (template fallback), charge minimum 0.1
      await supabase.rpc('consume_credits', {
        p_account_id: campaign.account_id,
        p_credit_type: 'universal',
        p_amount: 0.1,
        p_reference_id: campaign_id,
        p_reference_type: 'outreach_campaign',
        p_description: `Campanha ${campaign.name}: ${contacts.length} contatos (template)`,
        p_user_id: user.id,
      });
      creditsConsumed = 0.1;
    }

    // 9. Update campaign status
    const { error: updateError } = await supabase
      .from("recruitment_outreach_campaigns")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        contacts_queued: contacts.length,
      })
      .eq("id", campaign_id);

    if (updateError) {
      console.error("Error updating campaign:", updateError);
    }

    // 10. Log to communications
    // Determine preferred channel based on contacts
    const hasPhoneContacts = contacts.some(c => !!c.phone);
    const hasEmailContacts = contacts.some(c => !!c.email && !c.phone);
    const preferredChannel = hasPhoneContacts && hasEmailContacts ? 'both' : hasPhoneContacts ? 'whatsapp' : 'email';

    await supabase.from("recruitment_communications_log").insert({
      account_id: campaign.account_id,
      candidate_id: null,
      channel: preferredChannel === 'email' ? 'email' : 'whatsapp',
      direction: "outbound",
      event_type: "campaign_started",
      subject: `Campanha iniciada: ${campaign.name}`,
      status: "pending",
      metadata: {
        campaign_id: campaign_id,
        contacts_count: contacts.length,
        credits_consumed: creditsConsumed,
        channels: preferredChannel,
      },
      triggered_by: user.id,
    });

    console.log(`[outreach-campaign-start] Campaign started successfully with ${contacts.length} contacts, credits: ${creditsConsumed}`);

    return new Response(JSON.stringify({
      success: true,
      campaign_id: campaign_id,
      contacts_queued: contacts.length,
      credits_consumed: creditsConsumed,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[outreach-campaign-start] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
