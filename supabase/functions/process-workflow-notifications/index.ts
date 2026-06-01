import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// This function processes legacy scheduled notifications still in the queue.
// New notifications are no longer created here — the orchestrator dispatches immediately.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Fetch legacy pending notifications (should be none for new flow)
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from("recruitment_scheduled_notifications")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("❌ Error fetching pending notifications:", fetchError);
      throw fetchError;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, note: "No legacy notifications pending" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📬 Processing ${pendingNotifications.length} legacy scheduled notifications`);

    let processed = 0;
    let failed = 0;

    for (const notif of pendingNotifications) {
      try {
        // Mark legacy notifications as processed (skipped) — new orchestrator handles fresh ones
        await supabase
          .from("recruitment_scheduled_notifications")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("id", notif.id);

        console.log(`✅ Legacy notification ${notif.id} marked as processed`);
        processed++;
      } catch (notifError) {
        console.error(`❌ Error processing notification ${notif.id}:`, notifError);
        await supabase
          .from("recruitment_scheduled_notifications")
          .update({ status: "failed" })
          .eq("id", notif.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ process-workflow-notifications error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
