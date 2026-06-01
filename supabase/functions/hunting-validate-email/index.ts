// Valida emails de resultados de hunting via NeverBounce.
// Input: { hunting_result_ids?: string[]; emails?: string[] }
// - Skip se já validado nos últimos 90 dias
// - Atualiza recruitment_hunting_results + grava em recruitment_hunting_email_validation_log

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const NEVERBOUNCE_API = 'https://api.neverbounce.com/v4.2/single/check';

type NBResult = 'valid' | 'invalid' | 'disposable' | 'catchall' | 'unknown';

function mapNeverbounce(result: string): NBResult {
  switch (result) {
    case 'valid': return 'valid';
    case 'invalid': return 'invalid';
    case 'disposable': return 'disposable';
    case 'catchall': return 'catchall';
    default: return 'unknown';
  }
}

function scoreFromResult(r: NBResult): number {
  switch (r) {
    case 'valid': return 9;
    case 'catchall': return 5;
    case 'unknown': return 3;
    case 'disposable': return 1;
    case 'invalid': return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('NEVERBOUNCE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'NEVERBOUNCE_API_KEY not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auth check
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const huntingResultIds: string[] = Array.isArray(body.hunting_result_ids) ? body.hunting_result_ids : [];
    const directEmails: string[] = Array.isArray(body.emails) ? body.emails : [];

    type Target = { id?: string; email: string; account_id?: string | null; lastValidated?: string | null };
    const targets: Target[] = [];

    if (huntingResultIds.length > 0) {
      const { data: rows, error } = await supabaseAdmin
        .from('recruitment_hunting_results')
        .select('id, extracted_data, email_validated_at, search_id, recruitment_hunting_searches(account_id)')
        .in('id', huntingResultIds);
      if (error) throw error;
      for (const r of rows ?? []) {
        const email = (r.extracted_data as { email?: string } | null)?.email;
        if (!email) continue;
        targets.push({
          id: r.id,
          email,
          // @ts-ignore relação aninhada
          account_id: r.recruitment_hunting_searches?.account_id ?? null,
          lastValidated: r.email_validated_at,
        });
      }
    }

    for (const e of directEmails) {
      if (e && typeof e === 'string') targets.push({ email: e });
    }

    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    let valid = 0;
    let invalid = 0;
    let skipped = 0;
    let creditsUsed = 0;
    const results: Array<{ id?: string; email: string; status: NBResult; score: number; skipped?: boolean }> = [];

    for (const t of targets) {
      if (t.lastValidated && now - new Date(t.lastValidated).getTime() < NINETY_DAYS) {
        skipped++;
        results.push({ id: t.id, email: t.email, status: 'unknown', score: 0, skipped: true });
        continue;
      }

      const url = `${NEVERBOUNCE_API}?key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(t.email)}`;
      let nbStatus: NBResult = 'unknown';
      let raw: unknown = null;
      let credits = 1;
      try {
        const resp = await fetch(url);
        raw = await resp.json();
        const result = (raw as { result?: string; credits_info?: { paid_credits_used?: number } }).result ?? 'unknown';
        nbStatus = mapNeverbounce(result);
        credits = (raw as { credits_info?: { paid_credits_used?: number } }).credits_info?.paid_credits_used ?? 1;
      } catch (err) {
        console.error('NeverBounce error', t.email, err);
      }
      creditsUsed += credits;
      const score = scoreFromResult(nbStatus);
      if (nbStatus === 'valid') valid++; else if (nbStatus === 'invalid') invalid++;

      // Atualiza result se houver
      if (t.id) {
        await supabaseAdmin
          .from('recruitment_hunting_results')
          .update({
            email_validation_status: nbStatus,
            email_validation_provider: 'neverbounce',
            email_validation_score: score,
            email_validated_at: new Date().toISOString(),
          })
          .eq('id', t.id);
      }

      // Log auditoria
      await supabaseAdmin.from('recruitment_hunting_email_validation_log').insert({
        account_id: t.account_id ?? null,
        hunting_result_id: t.id ?? null,
        email: t.email,
        provider: 'neverbounce',
        result: nbStatus,
        score,
        credits_used: credits,
        raw_response: raw as Record<string, unknown>,
      });

      results.push({ id: t.id, email: t.email, status: nbStatus, score });
    }

    return new Response(
      JSON.stringify({
        total: targets.length,
        valid,
        invalid,
        skipped,
        credits_used: creditsUsed,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    console.error('hunting-validate-email error', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
