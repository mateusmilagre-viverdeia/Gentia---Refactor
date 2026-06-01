import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('verify-profile-consistency');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConsistencyResult {
  checked: boolean;
  corrected: boolean;
  correction_type: 'none' | 'filled_null' | 'created_membership' | 'cleared_orphan';
  old_account_id: string | null;
  new_account_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.log(`Checking profile consistency for user ${userId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, account_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      log.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar perfil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      log.log('No profile found for user');
      return new Response(
        JSON.stringify({ checked: true, corrected: false, correction_type: 'none' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get user's active memberships
    const { data: memberships, error: memberError } = await supabase
      .from('account_members')
      .select('id, account_id, role, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (memberError) {
      log.error('Error fetching memberships:', memberError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar memberships' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: ConsistencyResult = {
      checked: true,
      corrected: false,
      correction_type: 'none',
      old_account_id: profile.account_id,
      new_account_id: profile.account_id,
    };

    // Cenário A: account_id is NULL but user has memberships
    if (!profile.account_id && memberships && memberships.length > 0) {
      const oldestMembership = memberships[0]; // Already ordered by created_at ASC
      
      log.log(`Scenario A: Filling NULL account_id with oldest membership: ${oldestMembership.account_id}`);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ account_id: oldestMembership.account_id, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        log.error('Error updating profile:', updateError);
      } else {
        result.corrected = true;
        result.correction_type = 'filled_null';
        result.new_account_id = oldestMembership.account_id;
        log.log(`Successfully filled account_id for user ${userId}`);
      }

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cenário B: account_id points to org not in memberships
    if (profile.account_id) {
      const hasMembershipForAccount = memberships?.some(m => m.account_id === profile.account_id);

      if (!hasMembershipForAccount) {
        // Check if the company exists
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id, name')
          .eq('id', profile.account_id)
          .single();

        if (companyError || !company) {
          // Cenário C: Company doesn't exist - clear orphan reference
          log.log(`Scenario C: Clearing orphan account_id (company doesn't exist)`);
          
          // Use oldest membership if exists, otherwise set to null
          const newAccountId = memberships && memberships.length > 0 
            ? memberships[0].account_id 
            : null;

          const { error: updateError } = await supabase
            .from('profiles')
            .update({ account_id: newAccountId, updated_at: new Date().toISOString() })
            .eq('id', userId);

          if (!updateError) {
            result.corrected = true;
            result.correction_type = 'cleared_orphan';
            result.new_account_id = newAccountId;
            log.log(`Cleared orphan account_id for user ${userId}, new: ${newAccountId}`);
          }
        } else {
          // Company exists but user has no membership - create one
          log.log(`Scenario B: Creating missing membership for ${company.name}`);

          const { error: insertError } = await supabase
            .from('account_members')
            .insert({
              account_id: profile.account_id,
              user_id: userId,
              role: 'member',
              is_active: true,
            });

          if (insertError) {
            log.error('Error creating membership:', insertError);
          } else {
            result.corrected = true;
            result.correction_type = 'created_membership';
            log.log(`Created membership for user ${userId} in ${company.name}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
