import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BodySchema = z.object({
  account_id: z.string().uuid(),
});

// Order matters: child tables first to respect FK constraints
const TABLES_IN_DELETE_ORDER = [
  'candidate_process_history',
  'candidate_nps',
  'garantias_reposicao',
  'fees_historico',
  'commercial_proposals',
  'recruitment_applications',
  'chrome_extension_captures',
  'recruitment_candidates',
  'recruitment_jobs',
  'clientes_consultoria',
] as const;

// Tables without is_demo column — cleared by account_id only (safe audit logs)
const ACCOUNT_SCOPED_TABLES = ['indeed_submission_log'] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Validate JWT (Core rule: getUser, not getClaims)
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      console.error('[demo-clear] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = userData.user.id;

    // Validate body
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { account_id } = parsed.data;

    // Authorization: must be owner or admin of the account
    const { data: member, error: memberError } = await supabaseAdmin
      .from('account_members')
      .select('role, is_active')
      .eq('user_id', userId)
      .eq('account_id', account_id)
      .eq('is_active', true)
      .maybeSingle();

    if (memberError) {
      console.error('[demo-clear] Membership lookup error:', memberError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify access' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: only owners or admins can clear demo data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete demo records, table by table, in dependency-safe order
    const deletionResults: Record<string, number> = {};
    for (const table of TABLES_IN_DELETE_ORDER) {
      const { error: delError, count } = await supabaseAdmin
        .from(table)
        .delete({ count: 'exact' })
        .eq('account_id', account_id)
        .eq('is_demo', true);

      if (delError) {
        console.error(`[demo-clear] Failed to delete from ${table}:`, delError);
        return new Response(
          JSON.stringify({
            error: `Failed to clear demo data from ${table}`,
            details: delError.message,
            partial_results: deletionResults,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      deletionResults[table] = count ?? 0;
    }

    // Clear account-scoped audit tables (no is_demo column)
    for (const table of ACCOUNT_SCOPED_TABLES) {
      const { error: delError, count } = await supabaseAdmin
        .from(table)
        .delete({ count: 'exact' })
        .eq('account_id', account_id);
      if (delError) {
        console.warn(`[demo-clear] Failed to clear ${table}:`, delError.message);
      } else {
        deletionResults[table] = count ?? 0;
      }
    }

    // Update account_demo_config: deactivate flag + log clear event
    const nowIso = new Date().toISOString();
    const { error: cfgError } = await supabaseAdmin
      .from('account_demo_config')
      .update({
        demo_mode_active: false,
        deactivated_at: nowIso,
        deactivated_by: userId,
        last_clear_at: nowIso,
        demo_records_count: 0,
        updated_at: nowIso,
      })
      .eq('account_id', account_id);

    if (cfgError) {
      console.error('[demo-clear] Failed to update demo config:', cfgError);
      // Data was cleared, but config update failed — surface warning
      return new Response(
        JSON.stringify({
          success: true,
          warning: 'Demo data cleared but config update failed',
          deleted: deletionResults,
          config_error: cfgError.message,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalDeleted = Object.values(deletionResults).reduce((a, b) => a + b, 0);
    console.log(`[demo-clear] Cleared ${totalDeleted} demo records for account ${account_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletionResults,
        total_deleted: totalDeleted,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[demo-clear] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
