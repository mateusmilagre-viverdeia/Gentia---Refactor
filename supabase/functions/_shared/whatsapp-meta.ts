/**
 * Shared utility for sending WhatsApp messages via the Official Meta Cloud API.
 * Reads credentials from the `platform_whatsapp_config` table (global config).
 *
 * Demo Mode: when an `accountId` is provided AND the account has demo mode
 * active, the send is intercepted, logged into recruitment_communications_log,
 * and returned as a synthetic success — never reaching Meta.
 */
import { isDemoAccount, logDemoSkippedCommunication } from "./demoMode.ts";

interface MetaWhatsAppConfig {
  phone_number_id: string;
  access_token: string;
  is_active: boolean;
}

interface MetaSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Checks whether the Meta Cloud API WhatsApp is configured and active.
 */
export async function isMetaWhatsAppConfigured(supabase: any): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("platform_whatsapp_config")
      .select("phone_number_id, access_token, is_active")
      .limit(1)
      .maybeSingle();

    if (error || !data) return false;
    return Boolean(data.phone_number_id && data.access_token && data.is_active);
  } catch {
    return false;
  }
}

/**
 * Sends a free-form text message via the Meta Cloud API.
 * Fetches credentials from platform_whatsapp_config in the database.
 */
export async function sendWhatsAppViaMeta(params: {
  supabase: any;
  toPhone: string;
  message: string;
  accountId?: string;
  candidateId?: string | null;
  jobId?: string | null;
}): Promise<MetaSendResult> {
  const { supabase, toPhone, message, accountId, candidateId, jobId } = params;

  // Demo Mode interception
  if (accountId && (await isDemoAccount(supabase, accountId))) {
    await logDemoSkippedCommunication(supabase, {
      accountId,
      channel: "whatsapp",
      recipient: toPhone,
      messageType: "demo_text",
      body: message,
      candidateId,
      jobId,
    });
    console.log("[demoMode] WhatsApp text intercepted (not sent):", { accountId, toPhone });
    return { success: true, messageId: "demo-skipped" };
  }

  // 1. Fetch config from DB
  const { data: config, error: cfgError } = await supabase
    .from("platform_whatsapp_config")
    .select("phone_number_id, access_token, is_active")
    .limit(1)
    .maybeSingle();

  if (cfgError || !config) {
    console.error("WhatsApp Meta: config not found", cfgError);
    return { success: false, error: "WhatsApp config not found in database" };
  }

  if (!config.is_active) {
    console.warn("WhatsApp Meta: integration is inactive");
    return { success: false, error: "WhatsApp integration is inactive" };
  }

  if (!config.phone_number_id || !config.access_token) {
    return { success: false, error: "WhatsApp credentials incomplete (phone_number_id or access_token missing)" };
  }

  // 2. Normalize phone number (digits only)
  const phone = toPhone.replace(/\D/g, "");
  if (!phone) {
    return { success: false, error: "Invalid phone number" };
  }

  // 3. Call Meta Cloud API
  const url = `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "text",
    text: { body: message },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json();

    if (!res.ok) {
      const errorMsg = body?.error?.message || `Meta API error (${res.status})`;
      console.error("WhatsApp Meta send error:", { status: res.status, error: body?.error });
      return { success: false, error: errorMsg };
    }

    const messageId = body?.messages?.[0]?.id || null;
    console.log("WhatsApp Meta: message sent", { to: phone, messageId });
    return { success: true, messageId };
  } catch (err: any) {
    console.error("WhatsApp Meta: fetch error", err);
    return { success: false, error: err?.message || "Network error sending WhatsApp" };
  }
}

/**
 * Sends a template-based message via Meta Cloud API.
 * Used for workflow notifications (advancement, completion, rejection).
 */
export async function sendWhatsAppTemplateMeta(params: {
  supabase: any;
  toPhone: string;
  templateName: string;
  templateLanguage: string;
  bodyParams: string[];
  accountId?: string;
  candidateId?: string | null;
  jobId?: string | null;
}): Promise<MetaSendResult> {
  const { supabase, toPhone, templateName, templateLanguage, bodyParams, accountId, candidateId, jobId } = params;

  // Demo Mode interception
  if (accountId && (await isDemoAccount(supabase, accountId))) {
    await logDemoSkippedCommunication(supabase, {
      accountId,
      channel: "whatsapp",
      recipient: toPhone,
      messageType: `demo_template:${templateName}`,
      body: bodyParams.join(" | "),
      metadata: { templateName, templateLanguage, bodyParams },
      candidateId,
      jobId,
    });
    console.log("[demoMode] WhatsApp template intercepted (not sent):", { accountId, toPhone, templateName });
    return { success: true, messageId: "demo-skipped" };
  }

  const { data: config, error: cfgError } = await supabase
    .from("platform_whatsapp_config")
    .select("phone_number_id, access_token, is_active")
    .limit(1)
    .maybeSingle();

  if (cfgError || !config) {
    return { success: false, error: "WhatsApp config not found" };
  }
  if (!config.is_active) {
    return { success: false, error: "WhatsApp integration is inactive" };
  }
  if (!config.phone_number_id || !config.access_token) {
    return { success: false, error: "WhatsApp credentials incomplete" };
  }

  const phone = toPhone.replace(/\D/g, "");
  if (!phone) return { success: false, error: "Invalid phone number" };

  const templatePayload: Record<string, unknown> = {
    name: templateName,
    language: { code: templateLanguage },
  };

  if (bodyParams.length > 0) {
    templatePayload.components = [
      {
        type: "body",
        parameters: bodyParams.map((text) => ({ type: "text", text: text || " " })),
      },
    ];
  }

  const url = `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "template",
    template: templatePayload,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    if (!res.ok) {
      const errorMsg = body?.error?.message || `Meta API error (${res.status})`;
      console.error("WhatsApp Meta template send error:", { status: res.status, error: body?.error });
      return { success: false, error: errorMsg };
    }

    const messageId = body?.messages?.[0]?.id || null;
    console.log("WhatsApp Meta: template sent", { to: phone, template: templateName, messageId });
    return { success: true, messageId };
  } catch (err: any) {
    console.error("WhatsApp Meta: template fetch error", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

/**
 * Fetches workflow template configuration from platform_whatsapp_config.
 */
export async function getWorkflowTemplateConfig(supabase: any): Promise<{
  cultural?: { name: string; language: string };
  disc?: { name: string; language: string };
  technical?: { name: string; language: string };
  completion?: { name: string; language: string };
  rejection?: { name: string; language: string };
}> {
  const { data } = await supabase
    .from("platform_whatsapp_config")
    .select("template_cultural_name, template_cultural_language, template_disc_name, template_disc_language, template_technical_name, template_technical_language, template_completion_name, template_completion_language, template_rejection_name, template_rejection_language")
    .limit(1)
    .maybeSingle();

  if (!data) return {};

  const result: Record<string, { name: string; language: string }> = {};
  if (data.template_cultural_name) {
    result.cultural = { name: data.template_cultural_name, language: data.template_cultural_language || "pt_BR" };
  }
  if (data.template_disc_name) {
    result.disc = { name: data.template_disc_name, language: data.template_disc_language || "pt_BR" };
  }
  if (data.template_technical_name) {
    result.technical = { name: data.template_technical_name, language: data.template_technical_language || "pt_BR" };
  }
  if (data.template_completion_name) {
    result.completion = { name: data.template_completion_name, language: data.template_completion_language || "pt_BR" };
  }
  if (data.template_rejection_name) {
    result.rejection = { name: data.template_rejection_name, language: data.template_rejection_language || "pt_BR" };
  }
  return result;
}
