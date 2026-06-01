import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MARKETPLACE-SEARCH] ${step}${detailsStr}`);
};

interface SearchFilters {
  min_cultural_score?: number;
  disc_profiles?: string[];
  skills?: string[];
  location_city?: string;
  location_state?: string;
  remote_preference?: string;
  min_experience_years?: number;
  max_experience_years?: number;
  seniority_levels?: string[];
  limit?: number;
  offset?: number;
}

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

    const { buyer_account_id, filters = {} }: { buyer_account_id: string; filters: SearchFilters } = await req.json();
    
    if (!buyer_account_id) throw new Error("buyer_account_id is required");
    logStep("Request data", { buyer_account_id, filters });

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

    // Build the query
    let query = supabaseClient
      .from("shared_talent_pool")
      .select(`
        id,
        cultural_score,
        cultural_radar_data,
        disc_primary,
        disc_secondary,
        disc_scores,
        skills,
        experience_years,
        seniority_level,
        salary_range,
        location_city,
        location_state,
        remote_preference,
        unlock_count,
        created_at
      `)
      .eq("opted_out", false)
      .gt("available_until", new Date().toISOString())
      .neq("source_account_id", buyer_account_id); // Can't see your own candidates

    // Apply filters
    if (filters.min_cultural_score) {
      query = query.gte("cultural_score", filters.min_cultural_score);
    }

    if (filters.disc_profiles && filters.disc_profiles.length > 0) {
      query = query.in("disc_primary", filters.disc_profiles);
    }

    if (filters.skills && filters.skills.length > 0) {
      query = query.overlaps("skills", filters.skills);
    }

    if (filters.location_city) {
      query = query.ilike("location_city", `%${filters.location_city}%`);
    }

    if (filters.location_state) {
      query = query.eq("location_state", filters.location_state);
    }

    if (filters.remote_preference) {
      query = query.eq("remote_preference", filters.remote_preference);
    }

    if (filters.min_experience_years !== undefined) {
      query = query.gte("experience_years", filters.min_experience_years);
    }

    if (filters.max_experience_years !== undefined) {
      query = query.lte("experience_years", filters.max_experience_years);
    }

    if (filters.seniority_levels && filters.seniority_levels.length > 0) {
      query = query.in("seniority_level", filters.seniority_levels);
    }

    // Ordering and pagination
    query = query
      .order("cultural_score", { ascending: false })
      .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1);

    const { data: candidates, error: queryError } = await query;

    if (queryError) throw queryError;
    logStep("Query executed", { count: candidates?.length });

    // Check which candidates are already unlocked by this buyer
    const poolIds = candidates?.map(c => c.id) || [];
    
    let unlockedIds: string[] = [];
    if (poolIds.length > 0) {
      const { data: unlocks } = await supabaseClient
        .from("talent_pool_unlocks")
        .select("talent_pool_id")
        .eq("buyer_account_id", buyer_account_id)
        .in("talent_pool_id", poolIds);
      
      unlockedIds = unlocks?.map(u => u.talent_pool_id) || [];
    }

    // Add is_unlocked flag and anonymize IDs
    const results = candidates?.map((candidate, index) => ({
      ...candidate,
      display_id: `#${(filters.offset || 0) + index + 1}`,
      is_unlocked: unlockedIds.includes(candidate.id),
    })) || [];

    // Get total count for pagination
    const { count } = await supabaseClient
      .from("shared_talent_pool")
      .select("id", { count: "exact", head: true })
      .eq("opted_out", false)
      .gt("available_until", new Date().toISOString())
      .neq("source_account_id", buyer_account_id);

    return new Response(JSON.stringify({ 
      candidates: results,
      total: count || 0,
      limit: filters.limit || 20,
      offset: filters.offset || 0
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
