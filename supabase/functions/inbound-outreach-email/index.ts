import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Public webhook — no JWT verification
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Inbound email webhook for outreach replies.
 *
 * Configure on Resend (Inbound Email Routing):
 *   - Destination: this function's URL
 *   - Domain: same as OUTREACH_INBOUND_DOMAIN (default reply.gentia.tech)
 *
 * The reply_token is encoded in the localpart: reply+<token>@<domain>
 *
 * Resend posts a JSON payload like:
 * {
 *   "type": "email.received",
 *   "data": {
 *     "from": { "email": "...", "name": "..." },
 *     "to": [{ "email": "reply+abc123@reply.gentia.tech" }],
 *     "subject": "Re: ...",
 *     "text": "...",
 *     "html": "...",
 *     "headers": { ... },
 *     "message_id": "..."
 *   }
 * }
 */

function extractReplyToken(toAddresses: any[]): string | null {
  for (const addr of toAddresses ?? []) {
    const email = typeof addr === "string" ? addr : addr?.email;
    if (!email) continue;
    const match = String(email).match(/reply\+([a-f0-9]+)@/i);
    if (match) return match[1];
  }
  return null;
}

function stripQuoted(text: string): string {
  if (!text) return "";
  // Common reply separators (PT/EN)
  const markers = [
    /\nOn .+ wrote:\n/i,
    /\nEm .+ escreveu:\n/i,
    /\n-{2,} ?Original Message ?-{2,}/i,
    /\n_{5,}/,
    /\nDe: .+\nEnviada:/i,
    /\nFrom: .+\nSent:/i,
  ];
  let cut = text.length;
  for (const re of markers) {
    const m = text.match(re);
    if (m && m.index !== undefined && m.index < cut) cut = m.index;
  }
  return text.slice(0, cut).trim();
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const payload: any = await req.json();
    console.log("[inbound-outreach-email] Payload received", {
      type: payload?.type,
      hasData: !!payload?.data,
    });

    const data = payload?.data ?? payload;
    const toList = Array.isArray(data?.to) ? data.to : (data?.to ? [data.to] : []);
    const replyToken = extractReplyToken(toList);

    if (!replyToken) {
      console.warn("[inbound-outreach-email] No reply_token found in to addresses", { to: toList });
      // Return 200 to avoid retries on misrouted emails
      return new Response(JSON.stringify({ ok: true, ignored: "no_reply_token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up conversation
    const { data: conversation, error: convErr } = await supabase
      .from("recruitment_outreach_conversations")
      .select("id, account_id, campaign_id, contact_name, messages, unread_count")
      .eq("reply_token", replyToken)
      .maybeSingle();

    if (convErr) throw new Error(`Conversation lookup failed: ${convErr.message}`);
    if (!conversation) {
      console.warn("[inbound-outreach-email] No conversation for token", { replyToken });
      return new Response(JSON.stringify({ ok: true, ignored: "unknown_token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromEmail = typeof data?.from === "string" ? data.from : data?.from?.email ?? "";
    const fromName = typeof data?.from === "string" ? "" : data?.from?.name ?? "";
    const subject = data?.subject ?? "";
    const text = data?.text ?? "";
    const html = data?.html ?? "";
    const messageId = data?.message_id ?? data?.messageId ?? null;

    const cleanedText = stripQuoted(text);

    // Append to conversation messages
    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    const newMessage = {
      direction: "inbound",
      channel: "email",
      from_email: fromEmail,
      from_name: fromName,
      subject,
      content: cleanedText || text,
      html,
      message_id: messageId,
      received_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, newMessage];

    const { error: updateErr } = await supabase
      .from("recruitment_outreach_conversations")
      .update({
        messages: updatedMessages,
        status: "replied",
        last_message_at: new Date().toISOString(),
        last_unread_at: new Date().toISOString(),
        unread_count: (conversation.unread_count ?? 0) + 1,
      })
      .eq("id", conversation.id);

    if (updateErr) throw new Error(`Conversation update failed: ${updateErr.message}`);

    // Log
    await supabase.from("recruitment_communications_log").insert({
      account_id: conversation.account_id,
      candidate_id: null,
      channel: "email",
      direction: "inbound",
      event_type: "outreach_reply",
      subject: subject || `Reply: ${conversation.contact_name ?? ""}`,
      body: (cleanedText || text || "").substring(0, 1000),
      recipient: fromEmail,
      status: "received",
      metadata: {
        conversation_id: conversation.id,
        campaign_id: conversation.campaign_id,
        reply_token: replyToken,
        message_id: messageId,
      },
    });

    console.log("[inbound-outreach-email] Reply stored", {
      conversationId: conversation.id,
      from: fromEmail,
    });

    return new Response(JSON.stringify({ ok: true, conversation_id: conversation.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[inbound-outreach-email] Error:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
