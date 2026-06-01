// Shared helper to send emails via Resend, using platform_email_config from DB
// with fallback to RESEND_API_KEY env var.
//
// Demo Mode: when an `accountId` is provided AND the account has demo mode
// active, the send is intercepted, logged, and returned as a synthetic success.
import { isDemoAccount, logDemoSkippedCommunication } from "./demoMode.ts";

export const RESEND_DEFAULT_FROM_NAME = "Gentia";
export const RESEND_DEFAULT_FROM_EMAIL = "noreply@resend.ecpmais.com.br";
export const RESEND_NOTIFICATIONS_FROM_EMAIL = "notifications@resend.ecpmais.com.br";

export interface SendEmailParams {
  supabase?: any;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
  accountId?: string;
  candidateId?: string | null;
  jobId?: string | null;
}

export async function sendEmailViaResend(params: SendEmailParams): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { supabase, to, subject, html, text, replyTo, tags, accountId, candidateId, jobId } = params;

  // Demo Mode interception
  if (supabase && accountId && (await isDemoAccount(supabase, accountId))) {
    const recipient = Array.isArray(to) ? to.join(",") : to;
    await logDemoSkippedCommunication(supabase, {
      accountId,
      channel: "email",
      recipient,
      messageType: "demo_email",
      subject,
      body: text ?? html.slice(0, 500),
      metadata: { tags },
      candidateId,
      jobId,
    });
    console.log("[demoMode] Email intercepted (not sent):", { accountId, recipient, subject });
    return { ok: true, id: "demo-skipped" };
  }


  try {
    let emailConfig: any = null;
    if (supabase) {
      const { data } = await supabase
        .from("platform_email_config")
        .select("resend_api_key, resend_endpoint, from_name, from_email")
        .limit(1)
        .maybeSingle();
      emailConfig = data;
    }

    const apiKey = emailConfig?.resend_api_key || Deno.env.get("RESEND_API_KEY") || "";
    const endpoint = emailConfig?.resend_endpoint || "https://api.resend.com/emails";
    const fromName = params.fromName || emailConfig?.from_name || RESEND_DEFAULT_FROM_NAME;
    const fromEmail = params.fromEmail || RESEND_DEFAULT_FROM_EMAIL;

    if (!apiKey) {
      console.error("sendEmailViaResend: No API key configured");
      return { ok: false, error: "No Resend API key configured" };
    }

    const payload: Record<string, unknown> = {
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    if (text) payload.text = text;
    if (replyTo) payload.reply_to = replyTo;
    if (tags?.length) payload.tags = tags;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("sendEmailViaResend: Resend API error", { status: response.status, body });
      return { ok: false, error: `Resend error ${response.status}: ${body}` };
    }

    const body = await response.json().catch(() => ({}));
    return { ok: true, id: body?.id || body?.data?.id };
  } catch (err: any) {
    console.error("sendEmailViaResend: exception", err);
    return { ok: false, error: err?.message || "Unknown error" };
  }
}
