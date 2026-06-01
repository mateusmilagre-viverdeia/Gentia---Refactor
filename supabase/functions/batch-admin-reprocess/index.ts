import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, sessionId: singleSessionId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Single-session reprocess (admin-only, used for debugging/simulation)
    if (action === "reprocess-single") {
      if (!singleSessionId) {
        return new Response(JSON.stringify({ error: "sessionId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const resp = await fetch(`${supabaseUrl}/functions/v1/reprocess-culture-evaluation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sessionId: singleSessionId, _adminBypass: supabaseServiceKey }),
      });
      const data = await resp.json();
      return new Response(JSON.stringify({ sessionId: singleSessionId, status: resp.status, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow specific action to prevent misuse
    if (action !== "reprocess-zero-scores") {
      return new Response(JSON.stringify({ error: "Invalid action" }), { 
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }




    // Find all completed sessions with 0 score
    const { data: sessions, error } = await supabase
      .from("culture_interview_sessions")
      .select("id, matching_score, audio_storage_path, account_id")
      .eq("status", "completed")
      .eq("matching_score", 0)
      .order("completed_at", { ascending: false });

    if (error) throw error;

    console.log(`Found ${sessions?.length || 0} sessions with 0 score`);

    const results: any[] = [];

    for (const session of (sessions || [])) {
      try {
        console.log(`Processing session: ${session.id}`);
        
        // Count responses
        const { count } = await supabase
          .from("culture_interview_responses")
          .select("*", { count: "exact", head: true })
          .eq("session_id", session.id);

        console.log(`Session ${session.id}: ${count} responses, audio: ${!!session.audio_storage_path}`);

        // Determine action: retranscribe (if few/no responses) or reprocess
        let functionName: string;
        if ((count || 0) < 10 && session.audio_storage_path) {
          functionName = "retranscribe-culture-interview";
        } else if ((count || 0) >= 10) {
          functionName = "reprocess-culture-evaluation";
        } else {
          results.push({ sessionId: session.id, status: "skipped", reason: "no audio and no responses" });
          continue;
        }

        console.log(`Calling ${functionName} for session ${session.id}`);

        const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ sessionId: session.id }),
        });

        const data = await response.json();
        results.push({ sessionId: session.id, function: functionName, status: response.status, data });
        console.log(`Session ${session.id}: ${response.status}`, JSON.stringify(data).substring(0, 200));
      } catch (err) {
        results.push({ sessionId: session.id, status: "error", error: err.message });
        console.error(`Session ${session.id} error:`, err);
      }
    }

    return new Response(JSON.stringify({ total: sessions?.length || 0, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
