// Admin-only edge function to execute audit_overbilled_interviews backfill.
// Requires caller to be super_admin. Uses service-role for privileged RPC.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'missing token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON);
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isSuper, error: roleErr } = await admin.rpc('is_super_admin', { _user_id: userData.user.id });
    if (roleErr || !isSuper) {
      return new Response(JSON.stringify({ error: 'forbidden: super admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body.dry_run !== false; // default true for safety
    const since: string = body.since ?? new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await admin.rpc('audit_overbilled_interviews', {
      p_dry_run: dryRun,
      p_since: since,
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = data ?? [];
    const totalRefund = rows.reduce((s: number, r: any) => s + Number(r.refund_amount || 0), 0);

    return new Response(JSON.stringify({
      dry_run: dryRun,
      since,
      affected_sessions: rows.length,
      total_refund_credits: Math.round(totalRefund * 100) / 100,
      rows,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
