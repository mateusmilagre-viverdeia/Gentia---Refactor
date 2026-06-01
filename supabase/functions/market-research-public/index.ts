import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await sb
      .from("market_research_reports")
      .select("id, job_title, seniority, area, industry, location, branding, executive_summary, compensation_block, talent_intelligence_block, competitive_block, diagnosis_block, citations, status, expires_at, generation_completed_at")
      .eq("public_slug", slug)
      .eq("status", "ready")
      .maybeSingle();
    if (error || !data) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Increment view count async
    sb.from("market_research_reports").update({
      view_count: ((data as any).view_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
    }).eq("id", data.id).then(() => {});

    return new Response(JSON.stringify(data), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
