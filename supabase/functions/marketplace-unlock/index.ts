import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UNLOCK_COST = 8; // Credits charged per unlock

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MARKETPLACE-UNLOCK] ${step}${detailsStr}`);
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

    const { buyer_account_id, pool_id }: { buyer_account_id: string; pool_id: string } = await req.json();
    
    if (!buyer_account_id) throw new Error("buyer_account_id is required");
    if (!pool_id) throw new Error("pool_id is required");
    logStep("Request data", { buyer_account_id, pool_id });

    // Verify user has access to the buyer account
    const { data: memberCheck, error: memberError } = await supabaseClient
      .from("account_members")
      .select("id")
      .eq("account_id", buyer_account_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (memberError || !memberCheck) {
      throw new Error("User does not have access to this organization");
    }

    // Check if already unlocked
    const { data: existingUnlock } = await supabaseClient
      .from("talent_pool_unlocks")
      .select("id, revealed_data")
      .eq("buyer_account_id", buyer_account_id)
      .eq("talent_pool_id", pool_id)
      .single();

    if (existingUnlock) {
      logStep("Already unlocked, returning cached data");
      return new Response(JSON.stringify({ 
        success: true,
        already_unlocked: true,
        revealed_data: existingUnlock.revealed_data,
        credits_charged: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get the pool entry
    const { data: poolEntry, error: poolError } = await supabaseClient
      .from("shared_talent_pool")
      .select(`
        id,
        candidate_id,
        candidate_profile_id,
        source_account_id,
        cultural_score,
        cultural_radar_data,
        disc_primary,
        disc_secondary,
        disc_scores,
        skills,
        experience_years,
        seniority_level,
        location_city
      `)
      .eq("id", pool_id)
      .eq("opted_out", false)
      .gt("available_until", new Date().toISOString())
      .single();

    if (poolError || !poolEntry) {
      throw new Error("Candidate not found or no longer available");
    }

    // Can't unlock your own candidates
    if (poolEntry.source_account_id === buyer_account_id) {
      throw new Error("Cannot unlock candidates from your own organization");
    }

    // Check credit balance
    const { data: creditCheck, error: creditError } = await supabaseClient.rpc('check_credits', {
      p_account_id: buyer_account_id,
      p_credit_type: 'universal',
      p_required: UNLOCK_COST
    });

    if (creditError) throw new Error(`Credit check error: ${creditError.message}`);
    
    if (!creditCheck?.has_credits) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'insufficient_credits',
        message: 'Créditos insuficientes para desbloquear este candidato',
        required: UNLOCK_COST,
        available: creditCheck?.current_balance || 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 402,
      });
    }

    // Consume credits
    const { data: consumeResult, error: consumeError } = await supabaseClient.rpc('consume_credits', {
      p_account_id: buyer_account_id,
      p_credit_type: 'universal',
      p_amount: UNLOCK_COST,
      p_reference_id: pool_id,
      p_reference_type: 'talent_pool_unlock',
      p_description: 'Desbloqueio de candidato do Talent Pool'
    });

    if (consumeError) throw new Error(`Credit consumption error: ${consumeError.message}`);
    logStep("Credits consumed", { consumed: UNLOCK_COST });

    // Get candidate profile data
    let revealedData: Record<string, unknown> = {
      cultural_score: poolEntry.cultural_score,
      disc_primary: poolEntry.disc_primary,
      disc_secondary: poolEntry.disc_secondary,
    };

    // Get candidate info
    const { data: candidate } = await supabaseClient
      .from("recruitment_candidates")
      .select("name, email, phone, linkedin_url")
      .eq("id", poolEntry.candidate_id)
      .single();

    if (candidate) {
      revealedData = {
        ...revealedData,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        linkedin_url: candidate.linkedin_url,
      };
    }

    // Get profile data if exists
    if (poolEntry.candidate_profile_id) {
      const { data: profile } = await supabaseClient
        .from("candidate_profiles")
        .select("full_name, phone, linkedin_url, cv_url, city")
        .eq("id", poolEntry.candidate_profile_id)
        .single();

      if (profile) {
        revealedData = {
          ...revealedData,
          full_name: profile.full_name || revealedData.name,
          phone: profile.phone || revealedData.phone,
          linkedin_url: profile.linkedin_url || revealedData.linkedin_url,
          cv_url: profile.cv_url,
          city: profile.city,
        };
      }
    }

    // Get source company sector (not name, for privacy)
    const { data: sourceCompany } = await supabaseClient
      .from("companies")
      .select("sector")
      .eq("id", poolEntry.source_account_id)
      .single();

    if (sourceCompany) {
      revealedData.source_sector = sourceCompany.sector;
    }

    // Create unlock record
    const { error: insertError } = await supabaseClient
      .from("talent_pool_unlocks")
      .insert({
        buyer_account_id,
        buyer_user_id: user.id,
        talent_pool_id: pool_id,
        credits_charged: UNLOCK_COST,
        revealed_data: revealedData,
        status: 'unlocked'
      });

    if (insertError) {
      logStep("Warning: Failed to create unlock record", { error: insertError.message });
      // Don't fail the request, the unlock was successful
    }

    // Increment unlock count on pool entry
    await supabaseClient.rpc('increment_unlock_count', { pool_entry_id: pool_id });

    logStep("Unlock successful", { pool_id, buyer_account_id });

    return new Response(JSON.stringify({ 
      success: true,
      already_unlocked: false,
      revealed_data: revealedData,
      credits_charged: UNLOCK_COST,
      balance_after: consumeResult?.balance_after
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
