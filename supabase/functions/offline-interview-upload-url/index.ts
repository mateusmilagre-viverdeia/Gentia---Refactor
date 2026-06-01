import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_MIMES = new Set([
  "audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/x-m4a",
  "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg", "audio/opus",
  "video/mp4", "video/webm", "video/quicktime",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      accountId,
      jobId,
      candidateId,
      externalCandidateName,
      externalCandidateEmail,
      evaluationTypes,
      fileName,
      mimeType,
      language,
      recordedAt,
      notes,
    } = body || {};

    if (!accountId || !jobId || !Array.isArray(evaluationTypes) || evaluationTypes.length === 0 || !fileName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTypes = evaluationTypes.filter((t: string) => t === "cultural" || t === "technical");
    if (validTypes.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid evaluationTypes" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mimeType && !ALLOWED_MIMES.has(mimeType)) {
      return new Response(JSON.stringify({ error: `Unsupported file type: ${mimeType}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Membership check
    const { data: membership } = await supabaseAdmin
      .from("account_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("account_id", accountId)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build storage path
    const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const audioPath = `${accountId}/${jobId}/${timestamp}_${safeName}`;

    // Insert tracking row
    const { data: uploadRow, error: insertError } = await supabaseAdmin
      .from("offline_interview_uploads")
      .insert({
        account_id: accountId,
        job_id: jobId,
        candidate_id: candidateId || null,
        external_candidate_name: externalCandidateName || null,
        external_candidate_email: externalCandidateEmail || null,
        evaluation_types: validTypes,
        audio_path: audioPath,
        language: language || "pt",
        recorded_at: recordedAt || null,
        notes: notes || null,
        status: "uploaded",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !uploadRow) {
      console.error("Insert error", insertError);
      return new Response(JSON.stringify({ error: insertError?.message || "Failed to create upload record" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create signed upload URL
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("offline-interviews")
      .createSignedUploadUrl(audioPath);

    if (signError || !signed) {
      console.error("Sign error", signError);
      return new Response(JSON.stringify({ error: signError?.message || "Failed to sign URL" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      uploadId: uploadRow.id,
      audioPath,
      signedUrl: signed.signedUrl,
      token: signed.token,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
