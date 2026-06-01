// WhatsApp Intake Webhook (Meta Cloud API)
// Handles incoming WhatsApp messages: routes to orchestrator if sender is in active application,
// or processes as external CV intake otherwise.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "gentia-intake-2026";

const RESUME_KEYWORDS = ["currículo", "curriculo", "cv", "resume", "candidatura", "vaga", "oportunidade"];
const RESUME_MIMES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // Webhook verification (Meta Cloud API)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const payload = await req.json();
    console.log("[whatsapp-intake] payload:", JSON.stringify(payload).slice(0, 500));

    // Extract message from Meta webhook payload
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    const phoneNumberId = value?.metadata?.phone_number_id;

    if (!message) {
      return new Response(JSON.stringify({ ok: true, msg: "no message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sender = message.from; // E.164 without +
    const senderName = value?.contacts?.[0]?.profile?.name || sender;
    const messageType = message.type; // text, document, image, etc.
    const textBody = message.text?.body || message.document?.caption || "";

    // Resolve account from phone_number_id
    const { data: waConfig } = await supabase
      .from("recruitment_whatsapp_config")
      .select("account_id, access_token")
      .eq("phone_number_id", phoneNumberId)
      .eq("is_active", true)
      .maybeSingle();

    if (!waConfig) {
      console.warn("[whatsapp-intake] no account for phone_number_id", phoneNumberId);
      return new Response(JSON.stringify({ ok: true, msg: "unknown phone_number_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountId = waConfig.account_id;

    // Check if sender is a candidate in an active application → route to orchestrator
    const { data: activeApp } = await supabase
      .from("recruitment_applications")
      .select("id, status, candidate_id")
      .eq("account_id", accountId)
      .not("status", "in", "(rejected,withdrew,hired)")
      .limit(50);

    // Match sender by candidate phone (loose check)
    if (activeApp && activeApp.length > 0) {
      const candidateIds = activeApp.map((a: any) => a.candidate_id);
      const { data: matchedCandidates } = await supabase
        .from("recruitment_candidates")
        .select("id, phone")
        .in("id", candidateIds);

      const isActiveCandidate = matchedCandidates?.some((c: any) => {
        const cleanPhone = (c.phone || "").replace(/\D/g, "");
        return cleanPhone && (cleanPhone === sender || sender.endsWith(cleanPhone) || cleanPhone.endsWith(sender));
      });

      if (isActiveCandidate) {
        console.log("[whatsapp-intake] sender is active candidate, forwarding to orchestrator");
        // Forward to orchestrator (existing webhook handler)
        await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
          body: JSON.stringify(payload),
        }).catch((e) => console.error("[whatsapp-intake] forward failed", e));
        return new Response(JSON.stringify({ ok: true, routed: "orchestrator" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Otherwise: treat as external CV intake
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileMime: string | null = null;
    let isResume = RESUME_KEYWORDS.some((k) => textBody.toLowerCase().includes(k));

    if (messageType === "document" && message.document) {
      fileMime = message.document.mime_type;
      fileName = message.document.filename || `whatsapp-${Date.now()}.pdf`;
      if (RESUME_MIMES.includes(fileMime || "")) {
        isResume = true;
        // Download file from Meta
        try {
          const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${message.document.id}`, {
            headers: { Authorization: `Bearer ${waConfig.access_token}` },
          });
          const mediaJson = await mediaRes.json();
          if (mediaJson.url) {
            const fileRes = await fetch(mediaJson.url, {
              headers: { Authorization: `Bearer ${waConfig.access_token}` },
            });
            const fileBuf = await fileRes.arrayBuffer();
            const path = `${accountId}/${Date.now()}-${fileName}`;
            const { error: upErr } = await supabase.storage
              .from("external-resumes")
              .upload(path, fileBuf, { contentType: fileMime || "application/pdf", upsert: false });
            if (!upErr) fileUrl = path;
          }
        } catch (e) {
          console.error("[whatsapp-intake] file download failed", e);
        }
      }
    }

    if (!isResume && !fileUrl) {
      // Not a CV submission, ignore silently
      return new Response(JSON.stringify({ ok: true, msg: "not a CV" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create entry
    const { data: entryRow, error: entryErr } = await supabase
      .from("candidate_external_entries")
      .insert({
        account_id: accountId,
        channel: "whatsapp",
        sender,
        sender_name: senderName,
        raw_content: textBody,
        file_url: fileUrl,
        file_name: fileName,
        file_mime_type: fileMime,
        processing_status: "pending",
      })
      .select()
      .single();

    if (entryErr) {
      console.error("[whatsapp-intake] insert error", entryErr);
      return new Response(JSON.stringify({ error: entryErr.message }), { status: 500, headers: corsHeaders });
    }

    // Send confirmation via existing whatsapp-send
    fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({
        provider: "meta",
        toPhoneE164: sender,
        message: "✅ Recebemos seu currículo! Em breve nossa equipe entrará em contato caso surja uma oportunidade compatível com seu perfil.",
      }),
    }).catch((e) => console.error("[whatsapp-intake] confirmation send failed", e));

    // Trigger async processing
    fetch(`${SUPABASE_URL}/functions/v1/process-external-entry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ entry_id: entryRow.id }),
    }).catch((e) => console.error("[whatsapp-intake] process trigger failed", e));

    return new Response(JSON.stringify({ ok: true, entry_id: entryRow.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[whatsapp-intake] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
