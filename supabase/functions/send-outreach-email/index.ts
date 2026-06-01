import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface SendEmailParams {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  fromEmail: string;
  fromName?: string | null;
  replyToken: string;
  conversationId: string;
}

async function sendEmailViaResend(params: SendEmailParams): Promise<{ messageId?: string; raw: unknown }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") ?? Deno.env.get("RESEND_API_KEY");

  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

  // Reply-To uses the inbound webhook domain configured on Resend.
  // The reply_token in the localpart routes the inbound email back to this conversation.
  const inboundDomain = Deno.env.get("OUTREACH_INBOUND_DOMAIN") ?? "reply.gentia.tech";
  const replyTo = `reply+${params.replyToken}@${inboundDomain}`;

  const fromHeader = params.fromName
    ? `${params.fromName} <${params.fromEmail}>`
    : params.fromEmail;
  const toHeader = params.toName
    ? `${params.toName} <${params.to}>`
    : params.to;

  const body = {
    from: fromHeader,
    to: [toHeader],
    subject: params.subject,
    html: params.html,
    reply_to: replyTo,
    headers: {
      "X-Conversation-Id": params.conversationId,
      "X-Reply-Token": params.replyToken,
    },
    tags: [
      { name: "source", value: "outreach" },
      { name: "conversation_id", value: params.conversationId },
    ],
  };

  const res = await fetch(`${RESEND_GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[send-outreach-email] Resend error", { status: res.status, json });
    throw new Error(`Resend send failed (${res.status}): ${JSON.stringify(json)}`);
  }

  return { messageId: json?.id, raw: json };
}

function renderTemplate(tpl: string, vars: Record<string, string | null | undefined>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? "").toString());
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const { queueId } = await req.json();
    if (!queueId) {
      return new Response(JSON.stringify({ error: "queueId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: queueItem, error: qErr } = await supabase
      .from("recruitment_outreach_queue")
      .select("id, conversation_id, account_id, message_content, attempts, max_attempts")
      .eq("id", queueId)
      .single();

    if (qErr || !queueItem) throw new Error(`Queue item not found: ${qErr?.message}`);

    const { data: conversation, error: cErr } = await supabase
      .from("recruitment_outreach_conversations")
      .select("id, candidate_email, contact_name, campaign_id, reply_token, messages")
      .eq("id", queueItem.conversation_id)
      .single();

    if (cErr || !conversation) throw new Error(`Conversation not found: ${cErr?.message}`);
    if (!conversation.candidate_email) throw new Error("Conversation has no candidate_email");

    const { data: campaign, error: campErr } = await supabase
      .from("recruitment_outreach_campaigns")
      .select("from_email, from_name, subject_template, body_html_template, name")
      .eq("id", conversation.campaign_id)
      .single();

    if (campErr || !campaign) throw new Error(`Campaign not found: ${campErr?.message}`);
    if (!campaign.from_email) throw new Error("Campaign has no from_email configured");

    // Ensure reply_token exists (one-shot generation if missing)
    let replyToken = conversation.reply_token as string | null;
    if (!replyToken) {
      const { data: tokenData, error: tokenErr } = await supabase.rpc("generate_outreach_reply_token");
      if (tokenErr) throw new Error(`Failed to generate reply_token: ${tokenErr.message}`);
      replyToken = tokenData as string;
      await supabase
        .from("recruitment_outreach_conversations")
        .update({ reply_token: replyToken })
        .eq("id", conversation.id);
    }

    const vars = {
      candidate_name: conversation.contact_name ?? "",
      campaign_name: campaign.name ?? "",
      message: queueItem.message_content ?? "",
    };

    const subject = campaign.subject_template
      ? renderTemplate(campaign.subject_template, vars)
      : (campaign.name ?? "Mensagem");

    // If a body template exists, render it; otherwise wrap the message_content as a simple HTML body
    const html = campaign.body_html_template
      ? renderTemplate(campaign.body_html_template, vars)
      : `<div style="font-family: -apple-system, system-ui, sans-serif; line-height: 1.6;">${
          (queueItem.message_content || "").replace(/\n/g, "<br>")
        }</div>`;

    const result = await sendEmailViaResend({
      to: conversation.candidate_email,
      toName: conversation.contact_name,
      subject,
      html,
      fromEmail: campaign.from_email,
      fromName: campaign.from_name,
      replyToken: replyToken!,
      conversationId: conversation.id,
    });

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[send-outreach-email] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
