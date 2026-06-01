import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Step =
  | "profile"
  | "client"
  | "job"
  | "agent"
  | "candidate"
  | "team"
  | "pipeline"
  | "careers"
  | "credits"
  | "comms"
  | "culture"
  | "distribution";

const STEP_FIELD: Record<Step, string> = {
  profile: "step_profile_done",
  client: "step_client_done",
  job: "step_job_done",
  agent: "step_agent_done",
  candidate: "step_candidate_done",
  team: "step_team_done",
  pipeline: "step_pipeline_done",
  careers: "step_careers_done",
  credits: "step_credits_done",
  comms: "step_comms_done",
  culture: "step_culture_done",
  distribution: "step_distribution_done",
};

const AGENCY_STEPS: Step[] = ["profile", "client", "job", "agent", "candidate"];
const SELF_STEPS: Step[] = ["profile", "team", "pipeline", "careers", "credits"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { account_id, step, dismiss_until_hours } = body as {
      account_id: string;
      step?: Step;
      dismiss_until_hours?: number;
    };

    if (!account_id) {
      return new Response(JSON.stringify({ error: "Missing account_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify membership
    const { data: membership } = await supabase
      .from("account_members")
      .select("id")
      .eq("account_id", account_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure row exists
    const { data: existing } = await supabase
      .from("account_onboarding_progress")
      .select("*")
      .eq("account_id", account_id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("account_onboarding_progress").insert({ account_id });
    }

    const updates: Record<string, unknown> = {};

    if (step && STEP_FIELD[step]) {
      updates[STEP_FIELD[step]] = true;
    }

    if (typeof dismiss_until_hours === "number" && dismiss_until_hours > 0) {
      const until = new Date(Date.now() + dismiss_until_hours * 3600 * 1000);
      updates.dismissed_until = until.toISOString();
      updates.dismissed_at = new Date().toISOString();
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("account_onboarding_progress")
        .update(updates)
        .eq("account_id", account_id);
    }

    // Re-fetch and check completion
    const { data: progress } = await supabase
      .from("account_onboarding_progress")
      .select("*")
      .eq("account_id", account_id)
      .single();

    // Mark completed when EITHER flow is fully done
    const agencyDone = AGENCY_STEPS.every((s) => progress?.[STEP_FIELD[s]]);
    const selfDone = SELF_STEPS.every((s) => progress?.[STEP_FIELD[s]]);
    const allDone = agencyDone || selfDone;
    if (allDone && !progress?.completed_at) {
      await supabase
        .from("account_onboarding_progress")
        .update({ completed_at: new Date().toISOString() })
        .eq("account_id", account_id);
      progress!.completed_at = new Date().toISOString();
    }

    return new Response(JSON.stringify({ success: true, progress }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ onboarding-complete-check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
