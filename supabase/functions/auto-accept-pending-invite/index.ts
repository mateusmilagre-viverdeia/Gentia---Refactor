import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('auto-accept-pending-invite');

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
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: 'userId e email são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.log(`Processing for user ${userId} with email ${email}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for pending invites
    const { data: invite, error: inviteError } = await supabase
      .from('account_invites')
      .select(`
        id,
        account_id,
        role,
        expires_at,
        status,
        accepted
      `)
      .eq('email', email.toLowerCase().trim())
      .eq('accepted', false)
      .or('status.eq.sent,status.eq.paid_ready_to_send,status.eq.pending')
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

    if (inviteError) {
      log.error('Error checking invite:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar convite' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!invite) {
      log.log('No pending invite found');
      return new Response(
        JSON.stringify({ accepted: false, message: 'Nenhum convite pendente encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.log(`Found invite for company: ${companyName}, account_id: ${invite.account_id}`);

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('account_members')
      .select('id')
      .eq('user_id', userId)
      .eq('account_id', invite.account_id)
      .maybeSingle();

    if (existingMember) {
      log.log('User is already a member, marking invite as accepted');
      
      // Just mark invite as accepted
      await supabase
        .from('account_invites')
        .update({ accepted: true, status: 'accepted' })
        .eq('id', invite.id);

      return new Response(
        JSON.stringify({ 
          accepted: true, 
          alreadyMember: true,
          companyName 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add user to account_members
    const { error: memberError } = await supabase
      .from('account_members')
      .insert({
        user_id: userId,
        account_id: invite.account_id,
        role: invite.role,
        is_active: true,
      });

    if (memberError) {
      log.error('Error adding member:', memberError);
      return new Response(
        JSON.stringify({ error: 'Erro ao adicionar membro à organização' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile with account_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ account_id: invite.account_id })
      .eq('id', userId);

    if (profileError) {
      log.error('Error updating profile:', profileError);
      // Continue anyway, membership was created
    }

    // Mark invite as accepted
    const { error: updateError } = await supabase
      .from('account_invites')
      .update({ accepted: true, status: 'accepted' })
      .eq('id', invite.id);

    if (updateError) {
      log.error('Error updating invite:', updateError);
      // Continue anyway, membership was created
    }

    log.log(`Successfully added user to ${companyName}`);

    return new Response(
      JSON.stringify({
        accepted: true,
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
