import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: max 200 messages per hour = ~3 per minute
const BATCH_SIZE = 10;
const RETRY_DELAY_MS = 1000;

function normalizePhoneE164(input: string): string {
  return (input || "").replace(/\D/g, "");
}

async function sendWhatsAppViaZApi(params: {
  toPhoneE164: string;
  message: string;
}): Promise<{ status: number; response: unknown; messageId?: string }> {
  const baseUrl = Deno.env.get("ZAPI_BASE_URL")?.replace(/\/$/, "");
  const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
  const token = Deno.env.get("ZAPI_TOKEN");

  if (!baseUrl || !instanceId || !token) {
    throw new Error("Z-API secrets not configured");
  }

  const url = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
  const payload = {
    phone: normalizePhoneE164(params.toPhoneE164),
    message: params.message,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    console.error("Z-API error", { status: res.status, body: json });
    throw new Error(`Z-API request failed (${res.status})`);
  }

  return { 
    status: res.status, 
    response: json,
    messageId: json?.zapiMessageId || json?.messageId || null 
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    console.log("[outreach-queue-processor] Starting batch processing...");

    // 1. Fetch pending messages
    const { data: pendingMessages, error: fetchError } = await supabase
      .from("recruitment_outreach_queue")
      .select(`
        id,
        conversation_id,
        account_id,
        message_type,
        message_content,
        attempts,
        max_attempts,
        channel
      `)
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .lt("attempts", 3)
      .order("scheduled_for", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("Error fetching queue:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch queue" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log("[outreach-queue-processor] No pending messages");
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[outreach-queue-processor] Processing ${pendingMessages.length} messages`);

    let successCount = 0;
    let failCount = 0;

    for (const queueItem of pendingMessages) {
      try {
        // Mark as processing
        await supabase
          .from("recruitment_outreach_queue")
          .update({ 
            status: "processing",
            attempts: queueItem.attempts + 1,
          })
          .eq("id", queueItem.id);

        // Get conversation details (phone for whatsapp / email for email)
        const { data: conversation } = await supabase
          .from("recruitment_outreach_conversations")
          .select("contact_phone, candidate_email, contact_name, campaign_id, messages, channel")
          .eq("id", queueItem.conversation_id)
          .single();

        const channel = (queueItem as any).channel || conversation?.channel || "whatsapp";
        let messageId: string | null = null;

        if (channel === "email") {
          if (!conversation?.candidate_email) {
            throw new Error("No email found for conversation");
          }

          // Delegate send to send-outreach-email (handles Resend + reply_token)
          const { data: emailRes, error: emailErr } = await supabase.functions.invoke(
            "send-outreach-email",
            { body: { queueId: queueItem.id } },
          );

          if (emailErr || !emailRes?.success) {
            throw new Error(emailErr?.message || emailRes?.error || "Email send failed");
          }
          messageId = emailRes?.messageId ?? null;
        } else {
          if (!conversation?.contact_phone) {
            throw new Error("No phone number found for conversation");
          }
          const result = await sendWhatsAppViaZApi({
            toPhoneE164: conversation.contact_phone,
            message: queueItem.message_content,
          });
          messageId = result.messageId ?? null;
        }

        // Update queue as sent
        await supabase
          .from("recruitment_outreach_queue")
          .update({
            status: "sent",
            processed_at: new Date().toISOString(),
            zapi_message_id: messageId,
          })
          .eq("id", queueItem.id);

        // Update conversation messages
        const messages = conversation?.messages || [];
        const updatedMessages = messages.map((m: any) => {
          if (m.content === queueItem.message_content && m.status === "queued") {
            return { ...m, status: "sent", sent_at: new Date().toISOString(), zapi_id: messageId };
          }
          return m;
        });

        await supabase
          .from("recruitment_outreach_conversations")
          .update({
            status: "sent",
            messages: updatedMessages,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", queueItem.conversation_id);

        // Update campaign metrics - increment contacts_sent
        const { data: currentCampaign } = await supabase
          .from("recruitment_outreach_campaigns")
          .select("contacts_sent")
          .eq("id", conversation?.campaign_id)
          .single();

        await supabase
          .from("recruitment_outreach_campaigns")
          .update({ contacts_sent: (currentCampaign?.contacts_sent || 0) + 1 })
          .eq("id", conversation?.campaign_id);

        // Log communication
        await supabase.from("recruitment_communications_log").insert({
          account_id: queueItem.account_id,
          candidate_id: null,
          channel,
          direction: "outbound",
          event_type: "outreach_sent",
          subject: `Outreach: ${conversation?.contact_name ?? ""}`,
          body: queueItem.message_content.substring(0, 500),
          recipient: channel === "email" ? conversation?.candidate_email : conversation?.contact_phone,
          status: "sent",
          metadata: {
            queue_id: queueItem.id,
            conversation_id: queueItem.conversation_id,
            campaign_id: conversation?.campaign_id,
            message_id: messageId,
          },
        });

        successCount++;
        console.log(`[outreach-queue-processor] Sent via ${channel} to ${
          channel === "email" ? conversation?.candidate_email : conversation?.contact_phone
        }`);

        // Rate limit delay
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

      } catch (error: any) {
        console.error(`[outreach-queue-processor] Error processing ${queueItem.id}:`, error);

        const isMaxAttempts = queueItem.attempts + 1 >= queueItem.max_attempts;

        await supabase
          .from("recruitment_outreach_queue")
          .update({
            status: isMaxAttempts ? "failed" : "pending",
            error_message: error.message,
          })
          .eq("id", queueItem.id);

        if (isMaxAttempts) {
          // Update conversation as failed
          await supabase
            .from("recruitment_outreach_conversations")
            .update({ status: "failed" })
            .eq("id", queueItem.conversation_id);
        }

        failCount++;
      }
    }

    console.log(`[outreach-queue-processor] Completed: ${successCount} sent, ${failCount} failed`);

    return new Response(JSON.stringify({
      processed: pendingMessages.length,
      success: successCount,
      failed: failCount,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[outreach-queue-processor] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
