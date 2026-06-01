import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('check-invite-status');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log.log("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Parse request body or query params
    const url = new URL(req.url);
    let inviteId = url.searchParams.get('invite_id');
    let token = url.searchParams.get('token');

    if (req.method === "POST") {
      const body = await req.json();
      inviteId = body.invite_id || inviteId;
      token = body.token || token;
    }

    if (!inviteId && !token) {
      throw new Error("Missing invite_id or token");
    }

    log.log("Checking invite", { inviteId, hasToken: !!token });

    // Build query
    let query = supabaseClient
      .from('account_invites')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        account_id,
        companies:account_id (name)
      `);

    if (inviteId) {
      query = query.eq('id', inviteId);
    } else if (token) {
      query = query.eq('token', token);
    }

    const { data: invite, error } = await query.single();

    if (error || !invite) {
      log.log("Invite not found", { error });
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Convite não encontrado" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    const isExpired = now > expiresAt;

    // Update status if expired
    if (isExpired && invite.status !== 'expired' && invite.status !== 'accepted') {
      await supabaseClient
        .from('account_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);
      
      invite.status = 'expired';
    }

    // Determine if invite can be accepted
    const canAccept = invite.status === 'sent' && !isExpired;

    log.log("Invite status retrieved", { 
      inviteId: invite.id, 
      status: invite.status,
      isExpired,
      canAccept 
    });

    return new Response(JSON.stringify({ 
      valid: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expires_at: invite.expires_at,
        account_id: invite.account_id,
        company_name: (invite.companies as any)?.name,
      },
      canAccept,
      isExpired,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      valid: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
