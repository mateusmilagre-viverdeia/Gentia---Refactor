import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREDITS-CHECK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { org_id, credit_type, required = 1 } = await req.json();
    if (!org_id) throw new Error("org_id is required");
    logStep("Request data", { org_id, credit_type, required });

    // If credit_type is specified, check that specific type
    if (credit_type) {
      const { data: result, error } = await supabaseClient.rpc('check_credits', {
        p_account_id: org_id,
        p_credit_type: credit_type,
        p_required: required
      });

      if (error) throw error;
      logStep("Credit check result", result);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Otherwise, get all credit balances for the org
    const { data: credits, error: creditsError } = await supabaseClient
      .from("recruitment_usage_credits")
      .select("*")
      .eq("account_id", org_id);

    if (creditsError) throw creditsError;
    logStep("All credits fetched", { count: credits?.length });

    // Get credit costs for reference
    const { data: costs, error: costsError } = await supabaseClient
      .from("recruitment_credit_costs")
      .select("*")
      .eq("is_active", true);

    if (costsError) throw costsError;

    return new Response(JSON.stringify({ 
      credits: credits || [],
      costs: costs || []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
