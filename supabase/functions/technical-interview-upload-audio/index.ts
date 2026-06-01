import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { probeWebmDuration } from "../_shared/probeWebmDuration.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const sessionId = formData.get("sessionId") as string;

    if (!audioFile || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Audio file and sessionId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📤 Uploading audio for session: ${sessionId}`);
    console.log(`📁 File size: ${audioFile.size} bytes, type: ${audioFile.type}`);

    // Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from("technical_interview_sessions")
      .select("id, account_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("❌ Session not found:", sessionError);
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate storage path
    const timestamp = Date.now();
    const extension = audioFile.type.includes("webm") ? "webm" : 
                      audioFile.type.includes("mp4") ? "mp4" : 
                      audioFile.type.includes("mpeg") ? "mp3" : "webm";
    const storagePath = `${session.account_id}/${sessionId}/interview_${timestamp}.${extension}`;

    console.log(`📂 Storage path: ${storagePath}`);

    // Convert File to ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("technical-interview-audio")
      .upload(storagePath, uint8Array, {
        contentType: audioFile.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload audio", details: uploadError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Audio uploaded successfully:", uploadData.path);

    // Probe real audio duration — ground truth for billing
    let audioDurationSeconds: number | null = null;
    try {
      audioDurationSeconds = probeWebmDuration(uint8Array);
      console.log(`⏱️ Probed audio duration: ${audioDurationSeconds ?? "null"}s`);
    } catch (probeErr) {
      console.warn("⚠️ Failed to probe audio duration:", probeErr);
    }

    // Get signed URL for playback (valid for 7 days)
    const { data: urlData } = await supabase.storage
      .from("technical-interview-audio")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    const audioUrl = urlData?.signedUrl || null;

    // Update session with audio URL + probed duration
    const updatePayload: Record<string, unknown> = {
      audio_url: audioUrl,
      audio_storage_path: storagePath,
    };
    if (audioDurationSeconds && audioDurationSeconds > 0) {
      updatePayload.audio_duration_seconds = audioDurationSeconds;
    }

    const { error: updateError } = await supabase
      .from("technical_interview_sessions")
      .update(updatePayload)
      .eq("id", sessionId);

    if (updateError) {
      console.error("⚠️ Error updating session:", updateError);
    } else {
      console.log("✅ Session updated with audio URL");
    }

    return new Response(
      JSON.stringify({
        success: true,
        audioUrl,
        storagePath,
        audioDurationSeconds,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        error: "Server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
