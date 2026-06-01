// Email Intake Webhook (Postmark/SendGrid agnostic)
// Receives inbound emails and creates external candidate entries.
import { createClient } from "npm:@supabase/supabase-js@2";
import { RESEND_DEFAULT_FROM_EMAIL } from "../_shared/resend-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const POSTMARK_TOKEN = Deno.env.get("POSTMARK_INBOUND_TOKEN");

interface NormalizedEmail {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments: Array<{ name: string; contentType: string; content: string }>; // base64
}

function normalizePostmark(payload: any): NormalizedEmail {
  return {
    from: payload.From || payload.FromFull?.Email || "",
    fromName: payload.FromName || payload.FromFull?.Name || "",
    to: payload.To || payload.ToFull?.[0]?.Email || "",
    subject: payload.Subject || "",
    text: payload.TextBody || "",
    html: payload.HtmlBody || "",
    attachments: (payload.Attachments || []).map((a: any) => ({
      name: a.Name,
      contentType: a.ContentType,
      content: a.Content, // base64
    })),
  };
}

function normalizeSendgrid(payload: any): NormalizedEmail {
  // SendGrid Inbound Parse uses multipart/form-data; this assumes pre-parsed JSON
  return {
    from: payload.from || "",
    fromName: payload.fromName || "",
    to: payload.to || payload.envelope?.to?.[0] || "",
    subject: payload.subject || "",
    text: payload.text || "",
    html: payload.html || "",
    attachments: payload.attachments || [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Optional auth check for Postmark
    if (POSTMARK_TOKEN) {
      const auth = req.headers.get("authorization") || req.headers.get("x-postmark-token");
      if (auth !== `Bearer ${POSTMARK_TOKEN}` && auth !== POSTMARK_TOKEN) {
        // Allow through if no token sent yet (initial setup); log warning
        console.warn("[email-intake] missing/invalid Postmark token");
      }
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const payload = await req.json();
    console.log("[email-intake] payload keys:", Object.keys(payload));

    // Detect provider format
    const email: NormalizedEmail = payload.From !== undefined
      ? normalizePostmark(payload)
      : normalizeSendgrid(payload);

    if (!email.to || !email.from) {
      return new Response(JSON.stringify({ error: "Missing from/to" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve account by recipient address (handle "+tag" and case)
    const recipientEmail = email.to.toLowerCase().trim().replace(/^.*<(.+)>.*$/, "$1");
    const { data: intakeConfig } = await supabase
      .from("email_intake_config")
      .select("account_id, is_active")
      .ilike("dedicated_email", recipientEmail)
      .maybeSingle();

    if (!intakeConfig) {
      console.warn("[email-intake] no account for recipient", recipientEmail);
      return new Response(JSON.stringify({ ok: true, msg: "unknown recipient" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!intakeConfig.is_active) {
      return new Response(JSON.stringify({ ok: true, msg: "inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = intakeConfig.account_id;

    // Save first attachment (CV) to storage
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileMime: string | null = null;

    const cvAttachment = email.attachments.find((a) =>
      ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(a.contentType)
    );

    if (cvAttachment) {
      try {
        const binary = Uint8Array.from(atob(cvAttachment.content), (c) => c.charCodeAt(0));
        const path = `${accountId}/${Date.now()}-${cvAttachment.name}`;
        const { error: upErr } = await supabase.storage
          .from("external-resumes")
          .upload(path, binary, { contentType: cvAttachment.contentType, upsert: false });
        if (!upErr) {
          fileUrl = path;
          fileName = cvAttachment.name;
          fileMime = cvAttachment.contentType;
        } else {
          console.error("[email-intake] storage upload error", upErr);
        }
      } catch (e) {
        console.error("[email-intake] attachment decode error", e);
      }
    }

    // Create entry
    const { data: entryRow, error: entryErr } = await supabase
      .from("candidate_external_entries")
      .insert({
        account_id: accountId,
        channel: "email",
        sender: email.from,
        sender_name: email.fromName,
        subject: email.subject,
        raw_content: email.text || email.html.replace(/<[^>]+>/g, " "),
        file_url: fileUrl,
        file_name: fileName,
        file_mime_type: fileMime,
        processing_status: "pending",
      })
      .select()
      .single();

    if (entryErr) {
      console.error("[email-intake] insert error", entryErr);
      return new Response(JSON.stringify({ error: entryErr.message }), { status: 500, headers: corsHeaders });
    }

    // Send confirmation email via Resend (if configured)
    try {
      const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: `Gentia <${RESEND_DEFAULT_FROM_EMAIL}>`,
            to: [email.from],
            subject: "Recebemos seu currículo",
            html: `<p>Olá ${email.fromName || ""},</p><p>Recebemos seu currículo com sucesso. Nossa equipe entrará em contato caso surja uma oportunidade compatível.</p><p>Obrigado!</p>`,
          }),
        });
      }
    } catch (e) {
      console.warn("[email-intake] confirmation email failed", e);
    }

    // Trigger async processing
    fetch(`${SUPABASE_URL}/functions/v1/process-external-entry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ entry_id: entryRow.id }),
    }).catch((e) => console.error("[email-intake] process trigger failed", e));

    return new Response(JSON.stringify({ ok: true, entry_id: entryRow.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[email-intake] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
