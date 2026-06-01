import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Cron secret validation (allow service-to-service from cron)
  const cronHeader = req.headers.get("x-cron-secret");
  if (CRON_SECRET && cronHeader !== CRON_SECRET) {
    // Allow service role key as alternative for manual invokes
    const auth = req.headers.get("authorization") || "";
    if (!auth.includes(SERVICE_ROLE_KEY)) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // Find jobs with scheduled ROI reports due now
    const { data: jobs, error } = await admin
      .from("recruitment_jobs")
      .select("id, account_id, cliente_id, roi_report_scheduled_at")
      .lte("roi_report_scheduled_at", new Date().toISOString())
      .not("roi_report_scheduled_at", "is", null)
      .not("cliente_id", "is", null)
      .limit(50);

    if (error) throw error;

    if (!jobs?.length) {
      return new Response(JSON.stringify({ processed: 0, status: "no_pending_jobs", results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    for (const job of jobs || []) {
      // Skip if a report already exists
      const { data: existing } = await admin
        .from("process_roi_reports")
        .select("id")
        .eq("job_id", job.id)
        .eq("account_id", job.account_id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await admin
          .from("recruitment_jobs")
          .update({ roi_report_scheduled_at: null })
          .eq("id", job.id);
        results.push({ job_id: job.id, status: "skipped_exists" });
        continue;
      }

      // Invoke generation
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/generate-roi-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            job_id: job.id,
            account_id: job.account_id,
            generated_by: null,
          }),
        });

        if (!r.ok) {
          const errText = await r.text();
          console.error("scheduled ROI generation failed", { job_id: job.id, error: errText });
          results.push({ job_id: job.id, status: "generation_failed", error: errText });
          continue;
        }

        // Clear schedule on success
        await admin
          .from("recruitment_jobs")
          .update({ roi_report_scheduled_at: null })
          .eq("id", job.id);

        results.push({ job_id: job.id, status: "generated" });
      } catch (e: any) {
        results.push({ job_id: job.id, status: "error", error: e?.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
