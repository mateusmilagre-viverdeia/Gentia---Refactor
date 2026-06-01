import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('validate-invite');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invite_id } = await req.json();

    if (!invite_id) {
      return new Response(
        JSON.stringify({ error: 'invite_id is required', valid: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch invite with company name (using service role to bypass RLS)
    const { data: invite, error } = await supabase
      .from('account_invites')
      .select(`
        id,
        email,
        role,
        accepted,
        status,
        expires_at,
        account:companies(id, name)
      `)
      .eq('id', invite_id)
      .single();

    if (error || !invite) {
      log.error('Invite not found:', error);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Convite não encontrado' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('account_invites')
        .update({ status: 'expired' })
        .eq('id', invite_id);
        
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Este convite expirou' 
        }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already accepted
    if (invite.accepted || invite.status === 'accepted') {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Este convite já foi aceito' 
        }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if awaiting payment - invite not ready to be accepted yet
    if (invite.status === 'awaiting_payment') {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Este convite está aguardando confirmação de pagamento. Por favor, aguarde.' 
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow acceptance if status is 'sent' or 'pending' (backwards compatibility)
    const canAccept = invite.status === 'sent' || invite.status === 'pending' || !invite.status;

    // Return data including real email for internal use (needed for login comparison)
    const response = {
      valid: true,
      canAccept,
      status: invite.status || 'pending',
      company_name: (invite.account as any)?.name || 'Empresa',
      role: invite.role,
      expires_at: invite.expires_at,
      // Real email for internal comparison (not shown in UI)
      email: invite.email,
      // Masked email for display (e.g., "j***@example.com")
      masked_email: maskEmail(invite.email),
    };

    log.log(`Invite ${invite_id} validated successfully, status: ${invite.status}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Error in validate-invite:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Erro ao validar convite' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';
  
  const maskedLocal = local.length <= 2 
    ? '*'.repeat(local.length)
    : local[0] + '*'.repeat(Math.min(local.length - 2, 5)) + local[local.length - 1];
  
  return `${maskedLocal}@${domain}`;
}
