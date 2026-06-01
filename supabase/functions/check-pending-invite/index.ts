import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('check-pending-invite');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.log(`Checking for pending invite for email: ${email}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for pending invites
    const { data: invite, error } = await supabase
      .from('account_invites')
      .select(`
        id,
        role,
        expires_at,
        status,
        accepted,
        account_id
      `)
      .eq('email', email.toLowerCase().trim())
      .eq('accepted', false)
      .or('status.eq.sent,status.eq.paid_ready_to_send')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get company name separately
    let companyName = 'Organização';
    if (invite?.account_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', invite.account_id)
        .single();
      companyName = company?.name || 'Organização';
    }

    if (error) {
      log.error('Error checking invite:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar convite' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!invite) {
      log.log('No pending invite found');
      return new Response(
        JSON.stringify({ hasInvite: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.log(`Found pending invite for company: ${companyName}`);

    return new Response(
      JSON.stringify({
        hasInvite: true,
        inviteId: invite.id,
        companyName,
        role: invite.role,
      }),
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
