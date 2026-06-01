import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdatePreferencesRequest {
  token: string;
  allow_marketplace_sharing: boolean;
  opt_out_reason?: string;
}

interface GetPreferencesRequest {
  token: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-CANDIDATE-PREFERENCES] ${step}${detailsStr}`);
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // GET preferences by token
    if (req.method === "POST" && body.action === "get") {
      const { token }: GetPreferencesRequest = body;

      if (!token) {
        return new Response(
          JSON.stringify({ error: "token is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      logStep("Fetching preferences by token");

      // Find preferences by token
      const { data: preferences, error: fetchError } = await supabase
        .from('candidate_marketplace_preferences')
        .select('*')
        .eq('preferences_token', token)
        .gt('token_expires_at', new Date().toISOString())
        .single();

      if (fetchError || !preferences) {
        logStep("Token not found or expired", { error: fetchError?.message });
        return new Response(
          JSON.stringify({ error: "Token inválido ou expirado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get candidate info by email - use correct column names
      const { data: candidate } = await supabase
        .from('recruitment_candidates')
        .select('id, first_name, last_name, email')
        .eq('email', preferences.candidate_email)
        .limit(1)
        .single();

      const candidateName = candidate 
        ? [candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || 'Candidato'
        : 'Candidato';

      // Get pool stats for this candidate - use candidate_id, not source_candidate_id
      const { data: poolEntries } = await supabase
        .from('shared_talent_pool')
        .select('id, view_count, last_viewed_at')
        .eq('candidate_id', candidate?.id || '');

      const poolId = poolEntries?.[0]?.id;
      const totalViews = poolEntries?.reduce((sum, e) => sum + (e.view_count || 0), 0) || 0;
      const lastViewedAt = poolEntries?.[0]?.last_viewed_at || null;

      // Get unlock count and contacts
      let unlockCount = 0;
      let contactsReceived = 0;
      let uniqueViewers = 0;
      const viewsByWeek: { week: string; count: number }[] = [];

      if (poolId) {
        // Get unlocks
        const { data: unlocks } = await supabase
          .from('talent_pool_unlocks')
          .select('id, contact_initiated')
          .eq('talent_pool_id', poolId);

        unlockCount = unlocks?.length || 0;
        contactsReceived = unlocks?.filter(u => u.contact_initiated).length || 0;

        // Get unique viewers
        const { data: views } = await supabase
          .from('talent_pool_views')
          .select('viewer_account_id, viewed_at')
          .eq('talent_pool_id', poolId);

        if (views && views.length > 0) {
          // Count unique viewers
          uniqueViewers = new Set(views.map(v => v.viewer_account_id)).size;

          // Group by week
          const weekCounts: Record<string, number> = {};
          views.forEach(v => {
            const date = new Date(v.viewed_at);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const weekStart = new Date(date.setDate(diff)).toISOString().split('T')[0];
            weekCounts[weekStart] = (weekCounts[weekStart] || 0) + 1;
          });

          Object.entries(weekCounts).forEach(([week, count]) => {
            viewsByWeek.push({ week, count });
          });
          viewsByWeek.sort((a, b) => a.week.localeCompare(b.week));
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          preferences: {
            allow_marketplace_sharing: preferences.allow_marketplace_sharing,
            opted_out_at: preferences.opted_out_at,
            opt_out_reason: preferences.opt_out_reason,
          },
          candidate: {
            name: candidateName,
            email: preferences.candidate_email,
          },
          stats: {
            total_views: totalViews,
            interested_companies: unlockCount,
            unique_viewers: uniqueViewers,
            unlock_count: unlockCount,
            contacts_received: contactsReceived,
            views_by_week: viewsByWeek,
            last_viewed_at: lastViewedAt,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UPDATE preferences
    const { token, allow_marketplace_sharing, opt_out_reason }: UpdatePreferencesRequest = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Updating preferences", { allow_marketplace_sharing, hasReason: !!opt_out_reason });

    // Verify token is valid
    const { data: existing, error: checkError } = await supabase
      .from('candidate_marketplace_preferences')
      .select('id, candidate_email')
      .eq('preferences_token', token)
      .gt('token_expires_at', new Date().toISOString())
      .single();

    if (checkError || !existing) {
      logStep("Token not found or expired", { error: checkError?.message });
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update preferences - the trigger will handle pool updates
    const updateData: Record<string, unknown> = {
      allow_marketplace_sharing,
      updated_at: new Date().toISOString(),
    };

    if (!allow_marketplace_sharing && opt_out_reason) {
      updateData.opt_out_reason = opt_out_reason;
    }

    const { data: updated, error: updateError } = await supabase
      .from('candidate_marketplace_preferences')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      logStep("Error updating preferences", { error: updateError.message });
      throw updateError;
    }

    logStep("Preferences updated successfully", { 
      preferencesId: updated.id,
      newValue: allow_marketplace_sharing
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: allow_marketplace_sharing 
          ? "Suas preferências foram atualizadas. Seu perfil está visível para empresas."
          : "Você foi removido do Talent Pool. Seu perfil não será mais exibido.",
        preferences: {
          allow_marketplace_sharing: updated.allow_marketplace_sharing,
          opted_out_at: updated.opted_out_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error updating preferences", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
