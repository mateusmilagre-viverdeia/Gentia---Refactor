import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TALENT-POOL-ANALYTICS] ${step}${detailsStr}`);
};

interface AnalyticsRequest {
  account_id: string;
  view: "buyer" | "source" | "overview";
  period_days?: number;
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

    const { account_id, view = "buyer", period_days = 30 }: AnalyticsRequest = await req.json();
    
    if (!account_id) throw new Error("account_id is required");
    logStep("Request data", { account_id, view, period_days });

    // Verify user has access to the account
    const { data: memberCheck, error: memberError } = await supabaseClient
      .from("account_members")
      .select("id")
      .eq("account_id", account_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (memberError || !memberCheck) {
      throw new Error("User does not have access to this organization");
    }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - period_days);
    const periodStartISO = periodStart.toISOString();

    let analytics: Record<string, unknown> = {};

    if (view === "buyer" || view === "overview") {
      // Get unlocks made by this account
      const { data: unlocks, error: unlocksError } = await supabaseClient
        .from("talent_pool_unlocks")
        .select("*")
        .eq("buyer_account_id", account_id)
        .gte("created_at", periodStartISO);

      if (unlocksError) throw unlocksError;
      logStep("Unlocks fetched", { count: unlocks?.length });

      // Get views made by this account
      const { data: views, error: viewsError } = await supabaseClient
        .from("talent_pool_views")
        .select("*")
        .eq("viewer_account_id", account_id)
        .gte("viewed_at", periodStartISO);

      if (viewsError) throw viewsError;
      logStep("Views fetched", { count: views?.length });

      // Calculate funnel metrics
      const totalViews = views?.length || 0;
      const uniqueProfilesViewed = new Set(views?.map(v => v.talent_pool_id)).size;
      const totalUnlocks = unlocks?.length || 0;
      const contactsInitiated = unlocks?.filter(u => u.contact_initiated).length || 0;
      const interviewsScheduled = unlocks?.filter(u => u.interview_scheduled).length || 0;
      const hired = unlocks?.filter(u => u.hired).length || 0;
      const totalCreditsSpent = unlocks?.reduce((sum, u) => sum + (u.credits_charged || 0), 0) || 0;

      // Calculate conversion rates
      const viewToUnlock = uniqueProfilesViewed > 0 ? (totalUnlocks / uniqueProfilesViewed) * 100 : 0;
      const unlockToContact = totalUnlocks > 0 ? (contactsInitiated / totalUnlocks) * 100 : 0;
      const contactToInterview = contactsInitiated > 0 ? (interviewsScheduled / contactsInitiated) * 100 : 0;
      const interviewToHire = interviewsScheduled > 0 ? (hired / interviewsScheduled) * 100 : 0;
      const costPerHire = hired > 0 ? Math.round(totalCreditsSpent / hired) : 0;

      // Group by week for trends
      const unlocksByWeek: Record<string, number> = {};
      const hiresByWeek: Record<string, number> = {};
      const creditsByWeek: Record<string, number> = {};

      unlocks?.forEach(u => {
        const weekStart = getWeekStart(new Date(u.created_at));
        unlocksByWeek[weekStart] = (unlocksByWeek[weekStart] || 0) + 1;
        creditsByWeek[weekStart] = (creditsByWeek[weekStart] || 0) + (u.credits_charged || 0);
        if (u.hired && u.hired_at) {
          const hireWeek = getWeekStart(new Date(u.hired_at));
          hiresByWeek[hireWeek] = (hiresByWeek[hireWeek] || 0) + 1;
        }
      });

      analytics = {
        ...analytics,
        buyer: {
          funnel: {
            totalViews,
            uniqueProfilesViewed,
            totalUnlocks,
            contactsInitiated,
            interviewsScheduled,
            hired,
          },
          conversionRates: {
            viewToUnlock: Math.round(viewToUnlock * 10) / 10,
            unlockToContact: Math.round(unlockToContact * 10) / 10,
            contactToInterview: Math.round(contactToInterview * 10) / 10,
            interviewToHire: Math.round(interviewToHire * 10) / 10,
          },
          revenue: {
            totalCreditsSpent,
            costPerHire,
            creditsByWeek: Object.entries(creditsByWeek).map(([week, credits]) => ({ week, credits })),
          },
          trends: {
            unlocksByWeek: Object.entries(unlocksByWeek).map(([week, count]) => ({ week, count })),
            hiresByWeek: Object.entries(hiresByWeek).map(([week, count]) => ({ week, count })),
          },
        },
      };
    }

    if (view === "source" || view === "overview") {
      // Get pool entries from this account
      const { data: poolEntries, error: poolError } = await supabaseClient
        .from("shared_talent_pool")
        .select("id, view_count, unlock_count, created_at")
        .eq("source_account_id", account_id);

      if (poolError) throw poolError;
      logStep("Pool entries fetched", { count: poolEntries?.length });

      const poolIds = poolEntries?.map(p => p.id) || [];

      // Get unlocks of our candidates by others
      let sourceUnlocks: unknown[] = [];
      if (poolIds.length > 0) {
        const { data: unlocks, error: unlocksError } = await supabaseClient
          .from("talent_pool_unlocks")
          .select("*")
          .in("talent_pool_id", poolIds)
          .gte("created_at", periodStartISO);

        if (unlocksError) throw unlocksError;
        sourceUnlocks = unlocks || [];
      }

      const totalCandidatesShared = poolEntries?.length || 0;
      const totalViewsReceived = poolEntries?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
      const totalUnlocksReceived = sourceUnlocks.length;
      const totalCreditsGenerated = (sourceUnlocks as { credits_charged?: number }[])
        .reduce((sum, u) => sum + (u.credits_charged || 0), 0);
      const hiresFromOurPool = (sourceUnlocks as { hired?: boolean }[])
        .filter(u => u.hired).length;

      analytics = {
        ...analytics,
        source: {
          totalCandidatesShared,
          totalViewsReceived,
          totalUnlocksReceived,
          totalCreditsGenerated,
          hiresFromOurPool,
          avgUnlocksPerCandidate: totalCandidatesShared > 0 
            ? Math.round((totalUnlocksReceived / totalCandidatesShared) * 10) / 10 
            : 0,
        },
      };
    }

    // Get overall pool stats
    const { count: totalInPool } = await supabaseClient
      .from("shared_talent_pool")
      .select("id", { count: "exact", head: true })
      .eq("opted_out", false)
      .gt("available_until", new Date().toISOString());

    analytics.overview = {
      totalInPool: totalInPool || 0,
      periodDays: period_days,
    };

    logStep("Analytics computed successfully");

    return new Response(JSON.stringify(analytics), {
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

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}
